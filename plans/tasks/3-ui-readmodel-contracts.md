---
artifact_type: task
artifact_id: task_ui_readmodel_contracts_v1
task_family_id: ui-readmodel-contracts
sequence_key: "3"
task_id: 3-ui-readmodel-contracts
title: "UI Readmodel Contracts"
status: approved
phase: phase3
target_files:
  - src/contracts/ui/index.ts
  - src/contracts/ui/uiReadModel.ts
  - src/contracts/ui/uiActions.ts
  - src/contracts/ui/uiEvents.ts
  - src/contracts/ui/uiErrors.ts
  - src/types/ui.ts
  - src/types/protocol.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/ui/routerContracts.ts
  - src/v11/infrastructure/ui/routerHttpBody.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/ui/routerActions.ts
  - src/v11/infrastructure/ui/routerEvents.ts
  - src/v11/infrastructure/ui/eventsTypes.ts
  - src/v11/infrastructure/ui/presenters/bubblePresenter.ts
  - src/v11/infrastructure/ui/presenters/timelinePresenter.ts
  - ui/src/lib/types.ts
  - ui/src/lib/api.ts
  - ui/src/lib/events.ts
  - tests/contracts/uiContractParity.types.ts
  - tests/contracts/uiContractTransitSource.test.ts
prd_ref: null
plan_ref: plans/ui-contract-boundary-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
  - docs/architecture/v11-placement-and-extraction-governance.md
  - docs/modularity-review/2026-05-02-modularity-review.md
  - plans/ui-contract-boundary-plan-v1.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-02-ui-contract-boundary-plan-v1
---

# Task: UI Readmodel Contracts

## L0 - Policy

### Goal

Consolidate the wider UI API/read-model/action/event/error DTO surface behind
the canonical `src/contracts/ui/**` surface, after the foundation and core
contract rows have already established the import-boundary pattern.

This task owns UI-facing summary/detail/timeline/inbox/watchdog/review-policy
views, UI action request/result contracts, SSE event payloads, protocol payload
transit used by UI timelines, and UI API error bodies. It must not change
runtime command behavior, lifecycle semantics, remote execution behavior, or the
meaning of protocol messages.

### Domain / Control Model Summary

1. Business invariant: every UI API/read-model/action/event/error contract
   consumed by `ui/src/**` must be produced by the backend-owned,
   browser-safe `src/contracts/ui/**` surface.
2. Control model: `src/contracts/ui/**` owns DTO shape and literal contract
   authority for the UI boundary; runtime/application modules under `src/v11/**`
   own behavior and may consume or produce those contracts through typed
   adapters, but they are not UI contract authorities.
3. Read-path rule: `ui/src/lib/types.ts`, `ui/src/lib/api.ts`, and
   `ui/src/lib/events.ts` may import or re-export UI contracts only from
   `src/contracts/ui/**` or UI-local barrels that directly re-export that
   canonical surface.
4. Forbidden fallback: do not keep UI-local mirrored DTO definitions, direct
   UI imports from `src/v11/**`, or comment-based "keep in sync" contracts.
5. Allowed resolution path: when an existing UI DTO depends on internal runtime
   types, introduce a browser-safe canonical UI contract row first, then align
   backend presenter/router/event producers and UI consumers to that row.
6. Missing-data rule: this task preserves existing optional/null semantics.
   Missing runtime values must stay explicit as the current DTO already exposes
   them; the UI must not invent heuristic fallback fields during the migration.

### Plan Linkage

1. Parent plan: `plans/ui-contract-boundary-plan-v1.md`.
2. Parent gap closed: broad UI API/read-model/action/event/error DTOs stop being
   hand-mirrored between `src/types/ui.ts`, `ui/src/lib/types.ts`, router ports,
   HTTP body parsing, SSE events, and UI API/event consumers.
3. Depends on archived `1-ui-contract-foundation` and
   `2-core-ui-contracts`.
4. Unlocks plan completion once the canonical UI contract surface covers both
   small core contracts and broad read-model/action/event/error contracts.

### Scope Boundary

1. In scope:
   - `UiBubbleSummary`, `UiBubbleDetail`, `UiRepoSummary`,
     `UiTimelineEntry`, inbox/watchdog/meta-review summary views, and related
     nested UI read-model DTOs.
   - UI action input/result contracts in `src/v11/shared/ports/uiRouter.ts`
     and the HTTP body/action dispatch paths that parse or return those shapes.
   - `UiEvent`/snapshot/SSE payload contracts used by `routerEvents` and
     `ui/src/lib/events.ts`.
   - `UiApiErrorBody` and UI-facing error body typing.
   - parity/source guards proving UI-local declarations no longer mirror these
     contracts.
2. Out of scope:
   - lifecycle tuple changes, delete-bubble shape changes, state-validation
     diagnostics, and remote-execution contracts already handled by
     `2-core-ui-contracts`.
   - command behavior, protocol persistence, tmux/runtime orchestration,
     merge/delete side effects, and reviewer/meta-review state machine logic.
   - UI component layout or interaction changes beyond import/type alignment.
3. Narrow exception: if a router/presenter/event producer currently constructs
   the final UI-facing DTO inline, type imports may be updated so that producer
   output is checked against the canonical UI contract. Runtime branch behavior
   must remain unchanged.

## L1 - Change Contract

### Canonical Contract Matrix

| Row | Canonical Owner | Required Shape | Forbidden Drift | Evidence |
|---|---|---|---|---|
| R1: UI read-model DTOs | `src/contracts/ui/uiReadModel.ts` | Existing list/detail/repo/timeline/inbox/watchdog/meta-review DTO fields as currently exposed to the UI. | Renaming fields, widening `unknown` where concrete fields exist, importing `src/v11/**` into the canonical file, or dropping optional/null distinctions. | T1,T2,T6 |
| R2: UI action contracts | `src/contracts/ui/uiActions.ts` | Existing UI action input/result contracts for approve, request-rework, reply, commit, merge, delete, start, stop, restart, attach, open, and review-policy update. | Changing action semantics, side-effect ordering, override rules, or result truth sources. | T1,T3,T6 |
| R3: UI event contracts | `src/contracts/ui/uiEvents.ts` | Existing SSE event and snapshot payload contracts, including repo/bubble update/remove events. | Changing event names, event id/ts/repoPath fields, or snapshot payload meaning. | T1,T4,T6 |
| R4: UI API error body | `src/contracts/ui/uiErrors.ts` | Existing `UiApiErrorBody` code/message/details shape. | Changing error code taxonomy or using UI-local error body mirrors. | T1,T5,T6 |
| R5: Compatibility barrels | `src/types/ui.ts`, UI local barrels | Re-export or consume canonical contracts without independent mirrors. | Keeping duplicated interfaces or direct UI imports from `src/v11/**`. | T2,T3,T4,T5,T6 |

### Call-Site Matrix

| ID | File | Required Change | Forbidden Change | Evidence |
|---|---|---|---|---|
| CS1 | `src/contracts/ui/index.ts` | Export the new read-model/action/event/error contract rows. | Hide the new rows behind legacy-only paths. | T1 |
| CS2 | `src/types/ui.ts` | Become the backend compatibility surface for UI DTOs, importing/re-exporting from canonical files where safe. | Keep independent canonical definitions after `src/contracts/ui/**` owns the row. | T2,T6 |
| CS3 | `ui/src/lib/types.ts` | Replace broad UI-local DTO mirrors with imports/re-exports from canonical contracts or direct UI-local barrels backed by them. | Direct `src/v11/**` type import or structural mirror declarations. | T2,T6 |
| CS4 | `src/v11/shared/ports/uiRouter.ts` | Align action input/result types to canonical UI action contracts while preserving runtime semantics. | Move command behavior or parser semantics into contract files. | T3,T6 |
| CS5 | `src/v11/infrastructure/ui/routerHttpBody.ts` and router action files | Keep parsing behavior unchanged while ensuring parsed body/result shapes satisfy canonical action contracts. | Change accepted payloads or side-effect order as part of type migration. | T3 |
| CS6 | `src/v11/infrastructure/ui/routerEvents.ts`, `eventsTypes.ts`, and `ui/src/lib/events.ts` | Align SSE event payload typing to canonical event contracts. | Rename event kinds or change snapshot semantics. | T4,T6 |
| CS7 | `src/v11/infrastructure/ui/presenters/**` | Ensure presented UI read-model objects satisfy canonical read-model contracts. | Pull UI-only fallback heuristics into presenters. | T2 |
| CS8 | tests under `tests/contracts/**` | Extend parity and source-text guards to the broad contract rows and direct-import ban. | Remove coverage because imports share one source. | T2-T6 |

### Ownership and Deferred Semantics

1. `src/contracts/ui/**` owns structural UI contract authority only.
2. Runtime modules continue to own how each DTO is produced, when an action is
   allowed, and how events are emitted.
3. `src/types/protocol.ts` remains protocol authority; this task may expose
   browser-safe protocol payload transit through the canonical UI surface only
   where UI timeline/event DTOs already depend on it.
4. Internal meta-review, inbox, watchdog, and runtime-session modules remain
   behavior owners. This task only decides the UI-facing DTO path and prevents
   direct UI imports from their internal paths.

### Structured Input / Output Rules

1. Action body parsing remains owned by
   `src/v11/infrastructure/ui/routerHttpBody.ts`; this task may type the parsed
   output as canonical UI action input, but it must preserve the currently
   accepted required fields, optional fields, and malformed-body behavior.
2. Unknown request fields keep the existing parser behavior. If the current
   parser drops them, the canonical action contract must not imply retention; if
   the current parser preserves a `details` or passthrough object, the canonical
   row must name that field explicitly.
3. Malformed, partial, duplicate, or multi-candidate request cases keep the
   current UI router error path and `UiApiErrorBody` code taxonomy.
4. Action result truth comes from the existing command/router result after the
   side effect completes. The contract migration must not make pre-side-effect
   request acceptance look like final success.
5. SSE event payloads keep the current event kind allowlist and snapshot shape.
   The canonical event row must describe emitted payloads, not introduce a
   second event assembly path.
6. UI read-model DTOs keep current nullability and optionality. If an internal
   runtime field is unavailable, producer code must continue to emit the same
   explicit `null`, omitted optional field, or existing fallback value that the
   current DTO already exposes.

### Mirrored Surface Checklist

When any row in the Canonical Contract Matrix changes, keep these surfaces
aligned in the same implementation:

1. L0 control-model bullets and scope boundary.
2. Canonical Contract Matrix rows R1-R5.
3. Call-Site Matrix rows CS1-CS8.
4. Structured Input / Output Rules.
5. L2 Required Tests T1-T8.
6. Parent plan Open Tasks summary if scope or status changes.

No mirrored surface may introduce a field role, fallback behavior, or ownership
claim that is absent from the Canonical Contract Matrix.

## L2 - Verification Contract

### Required Tests

| ID | Command / Check | Required Coverage |
|---|---|---|
| T1 | `pnpm typecheck` | Canonical contracts compile from backend and UI import paths. |
| T2 | `pnpm exec vitest run tests/contracts/uiContractParity.types.ts` | Read-model DTO parity across canonical, backend compatibility, and UI consumer surfaces. |
| T3 | `pnpm exec vitest run tests/contracts/uiContractParity.types.ts` | UI action input/result parity for router port and UI API surfaces. |
| T4 | `pnpm exec vitest run tests/contracts/uiContractParity.types.ts` | SSE event/snapshot payload parity for backend events and UI event consumers. |
| T5 | `pnpm exec vitest run tests/contracts/uiContractParity.types.ts` | `UiApiErrorBody` parity and error-code taxonomy preservation. |
| T6 | `pnpm exec vitest run tests/contracts/uiContractTransitSource.test.ts` | Source guard proves no broad UI contract row is mirrored in `ui/src/lib/types.ts` and no direct UI import from `src/v11/**` remains for covered rows. |
| T7 | `pnpm fitness:check:ci` | Boundary guard still rejects UI imports from internal runtime/application paths. |
| T8 | `pnpm --dir ui test` | UI API/event/type consumers still compile and pass local behavior tests. |

### Acceptance Criteria

1. `src/contracts/ui/**` exports browser-safe canonical contracts for all
   in-scope broad UI rows.
2. `ui/src/lib/types.ts` no longer declares mirrored read-model/action/event
   DTOs for the in-scope rows.
3. `ui/src/lib/types.ts`, `ui/src/lib/api.ts`, and `ui/src/lib/events.ts` do
   not import `src/v11/**` directly for in-scope contract authority.
4. Backend router/presenter/event producers type-check against the same
   canonical contracts consumed by the UI.
5. Runtime behavior and payload semantics are preserved; changes are limited to
   contract authority and import path alignment.
6. Parity/source guard tests fail on reintroduced mirrors or overlong
   compatibility chains.

### Validation Order

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm exec vitest run tests/contracts/uiContractParity.types.ts tests/contracts/uiContractTransitSource.test.ts`
5. `pnpm --dir ui test`
6. `pnpm test`
7. `pnpm build`
