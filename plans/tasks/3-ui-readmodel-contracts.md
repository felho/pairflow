---
artifact_type: task
artifact_id: task_ui_readmodel_contracts_v1
task_family_id: ui-readmodel-contracts
sequence_key: "3"
task_id: 3-ui-readmodel-contracts
title: "UI Readmodel Contracts"
status: implementable
phase: phase3
target_files:
  - src/contracts/ui/index.ts
  - src/contracts/ui/uiReadModel.ts
  - src/contracts/ui/uiActions.ts
  - src/contracts/ui/uiEvents.ts
  - src/contracts/ui/uiErrors.ts
  - src/types/ui.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/ui/routerContracts.ts
  - src/v11/infrastructure/ui/routerHttp.ts
  - src/v11/infrastructure/ui/routerHttpBody.ts
  - src/v11/infrastructure/ui/routerHttpErrors.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/ui/routerActions.ts
  - src/v11/infrastructure/ui/events.ts
  - src/v11/infrastructure/ui/eventsFilter.ts
  - src/v11/infrastructure/ui/eventsLog.ts
  - src/v11/infrastructure/ui/eventsSnapshot.ts
  - src/v11/infrastructure/ui/routerEvents.ts
  - src/v11/infrastructure/ui/eventsTypes.ts
  - src/v11/infrastructure/ui/presenters/bubblePresenter.ts
  - src/v11/infrastructure/ui/presenters/timelinePresenter.ts
  - ui/src/lib/contracts/uiReadModel.ts
  - ui/src/lib/contracts/uiActions.ts
  - ui/src/lib/contracts/uiEvents.ts
  - ui/src/lib/contracts/uiErrors.ts
  - ui/src/lib/types.ts
  - ui/src/lib/api.ts
  - ui/src/lib/events.ts
  - ui/src/lib/events.test.ts
  - ui/src/components/expanded/BubbleTimeline.tsx
  - ui/src/components/expanded/BubbleTimeline.test.tsx
  - ui/src/state/useBubbleStore.test.ts
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
doc_bubble_id: 3-ui-readmodel-contracts-doc
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
   - modularity-review recommendation 5 follow-up work that reshapes
     `UiRouterDependencies` into narrower query/mutation/capability ports. This
     task may type UI-facing payloads used by the current port, but it must not
     split or redesign the port.
3. Narrow exception: if a router/presenter/event producer currently constructs
   the final UI-facing DTO inline, type imports may be updated so that producer
   output is checked against the canonical UI contract. Runtime branch behavior
   must remain unchanged.
4. Narrow event-parser exception: backend already emits `repo.removed`, but the
   current UI event parser does not accept it. This task may widen the
   `ui/src/lib/events.ts` validator to accept `repo.removed` only with the
   existing shallow event checks (`id`, `ts`, `type`, and `repoPath`) so the UI
   consumer matches the existing backend event stream. No other parser
   acceptance widening is authorized.

### Current Source Anchors

The implementation must use the current repository surfaces below as the
field-level source of truth before moving ownership. If a source anchor and a
consumer mirror disagree, preserve the currently emitted backend/API payload and
make the disagreement explicit in the parity/source guard rather than silently
choosing the UI-local mirror.

1. Read-model anchors:
   - `src/types/ui.ts` currently defines the backend-facing UI DTOs that must
     move behind the canonical row: `UiBubbleStateCounts`, `UiRuntimeHealth`,
     `UiBubbleAttentionCode`, `UiBubbleAttention`,
     `UiBubbleMetaReviewSummary`, `UiPendingInboxCounts`,
     `UiBubbleInboxItem`, `UiBubbleInbox`, `UiBubbleWatchdog`,
     `UiBubbleTranscriptSummary`, `UiBubbleSummary`, `UiBubbleDetail`,
     `UiRepoSummary`, and `UiTimelineEntry`.
   - Canonicalization may introduce browser-safe replacement contract names
     such as `UiRuntimeSessionRecord`, `UiPendingInboxItemSource`, and
     `UiBubbleReviewPolicy` when the current shape depends on internal
     `src/v11/**` types.
   - `UiRuntimeSessionRecord` reconciliation is a presenter/router boundary
     projection: producers that currently receive `RuntimeSessionRecord` keep
     reading that runtime-owned record, then assign or project only the
     UI-exposed serializable fields into the canonical `UiRuntimeSessionRecord`
     shape. Do not rename or move `runtimeSessionsRegistry.ts`.
   - `src/v11/infrastructure/ui/presenters/bubblePresenter.ts` is the
     producer anchor for list/detail/repo objects.
   - `src/v11/infrastructure/ui/presenters/timelinePresenter.ts` is the
     producer anchor for timeline entries and currently narrows remote/lenient
     transcript payloads before presenting them.
   - `ui/src/lib/types.ts` is a consumer convenience barrel only after this
     task; any matching declarations there are mirrors to remove or convert to
     re-exports.
2. Internal dependency anchors that must become browser-safe transit contracts
   instead of direct UI/v11 imports:
   - `RuntimeSessionRecord` fields currently used in UI summaries come from
     `src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.ts`
     or the equivalent port surface.
   - `MetaReviewGateRoute`, inbox item type/recommendation fields,
     `PendingInboxItemV11`, watchdog status, and review-policy runtime fields
     currently reach UI DTOs through internal `src/v11/**` imports.
   - `BubbleLifecycleState`, review-policy runtime fields, and lifecycle literal
     transit currently originate from `src/types/bubble.ts`; canonical UI files
     may use the existing lifecycle contract path already established by
     `2-core-ui-contracts`, but this task must not redefine lifecycle tuples.
   - `ProtocolEnvelopePayload` and `ProtocolMessageType` remain owned by
     `src/types/protocol.ts`; the canonical UI read-model may type timeline
     transit with those protocol types but must not redefine protocol message
     semantics.
3. Action anchors:
   - Request parser behavior is in
     `src/v11/infrastructure/ui/routerHttpBody.ts`.
   - Router port input/result shape is in
     `src/v11/shared/ports/uiRouter.ts`.
   - Action result assembly and returned payload shape are in
     `src/v11/infrastructure/ui/routerActionDispatch.ts` and
     `src/v11/infrastructure/ui/routerActions.ts`.
   - UI client request/result consumption is in `ui/src/lib/api.ts` and
     `ui/src/lib/types.ts`.
4. Event/error anchors:
   - Backend SSE event assembly and event history are in
     `src/v11/infrastructure/ui/events.ts`,
     `src/v11/infrastructure/ui/eventsFilter.ts`,
     `src/v11/infrastructure/ui/eventsLog.ts`,
     `src/v11/infrastructure/ui/eventsSnapshot.ts`, and
     `src/v11/infrastructure/ui/routerEvents.ts`.
   - The stream event-name source anchors are `routerEvents.ts` writes and
     `eventsLog.ts` event factories. `ui/src/lib/events.ts` listener
     registrations are consumer/parser anchors, not event-name authority.
   - UI event parsing and listener registration are in `ui/src/lib/events.ts`.
   - `UiApiErrorBody` is consumed by
     `src/v11/infrastructure/ui/routerContracts.ts`,
     `src/v11/infrastructure/ui/routerHttp.ts`,
     `src/v11/infrastructure/ui/routerHttpErrors.ts`, and `ui/src/lib/api.ts`.

## L1 - Change Contract

### Canonical Contract Matrix

| Row | Canonical Owner | Required Shape | Forbidden Drift | Evidence |
|---|---|---|---|---|
| R1: UI read-model DTOs | `src/contracts/ui/uiReadModel.ts` | Canonicalize and export the exact read-model symbols from the `src/types/ui.ts` family: `UiBubbleStateCounts`, `UiRuntimeHealth`, `UiRuntimeSessionRecord`, `UiBubbleAttentionCode`, `UiBubbleAttention`, `UiBubbleMetaReviewSummary`, `UiPendingInboxCounts`, `UiPendingInboxItemSource`, `UiBubbleInboxItem`, `UiBubbleInbox`, `UiBubbleWatchdog`, `UiBubbleReviewPolicy`, `UiBubbleTranscriptSummary`, `UiBubbleSummary`, `UiBubbleDetail`, `UiRepoSummary`, and `UiTimelineEntry`. Replacement names such as `UiRuntimeSessionRecord`, `UiPendingInboxItemSource`, and `UiBubbleReviewPolicy` are authorized only by Ownership rule 5 and must be canonical exported symbols, not anonymous inline projections. Timeline payload must remain protocol transit (`ProtocolEnvelopePayload`) instead of UI-local `Record<string, unknown>` widening. | Renaming fields, widening `unknown` where concrete fields exist, importing `src/v11/**` into the canonical file, dropping optional/null distinctions, or moving producer fallback/normalization behavior into contracts. | T1,T2,T6,T11,T13 |
| R2: UI action contracts | `src/contracts/ui/uiActions.ts` | Canonicalize request/result contracts used by approve (`refs`, `overrideNonApprove`, `overrideReason`), request-rework/reply (`message`, `refs`), commit (`stageAll`, `message`, `refs`), merge (`push`, `deleteRemote`), delete (`force`), start/stop/restart/open/attach, and review-policy update (`reviewLoopMode`, `reviewBlockingMinSeverity`, `metaReviewQualityPreset`, `expectedBubbleToml`). Canonical result exports must include the existing public router result symbols: `UiEmitApprovalDecisionResult`, `UiEmitRequestReworkImmediateResult`, `UiEmitRequestReworkQueuedResult`, `UiEmitRequestReworkResult`, `UiEmitHumanReplyResult`, `UiCommitBubbleResult`, `UiMergeBubbleResult`, `UiOpenBubbleResult`, `UiStartBubbleResult`, `UiStopBubbleResult`, `UiRestartBubbleResult`, `UiAttachBubbleResult`, `UiUpdateBubbleReviewPolicyResult`, and the delete-bubble result alias consumed by the UI. Result DTOs must cover the public action response payloads already returned by the router; dependency bags and runtime capability contracts remain owned by router ports/runtime modules. | Changing action semantics, parser acceptance/rejection behavior, side-effect ordering, override rules, legacy-field rejection such as `auto`/`metaReviewAutoReworkMinSeverity`, result truth sources, or promoting router dependency/capability bags into canonical UI action contracts. | T1,T3,T6,T8,T9,T13 |
| R3: UI event contracts | `src/contracts/ui/uiEvents.ts` | Canonicalize the data payload contracts: `UiEventsConnectedPayload`, `UiEventBase`, `UiBubbleUpdatedEvent`, `UiBubbleRemovedEvent`, `UiRepoUpdatedEvent`, `UiRepoRemovedEvent`, `UiSnapshotEvent`, and `UiEvent` as emitted by the backend broker/log/snapshot path. `UiEvent` is the parsed non-`connected`, non-`heartbeat` data union and includes `UiSnapshotEvent` plus the bubble/repo update/remove event payloads. The SSE stream event-name allowlist is `connected`, `snapshot`, `bubble.updated`, `bubble.removed`, `repo.updated`, `repo.removed`, and `heartbeat`; `connected` uses `UiEventsConnectedPayload`, and `heartbeat` has no `UiEvent` data payload. | Changing event names, event id/ts/repoPath fields, snapshot payload meaning, filtering semantics, history replay, reconnect/staleness fallback behavior, or treating transport-only `heartbeat` as a domain event payload. | T1,T4,T6,T8,T10,T13 |
| R4: UI API error body | `src/contracts/ui/uiErrors.ts` | Canonicalize `UiApiErrorBody` with `error.code` limited to `bad_request`, `not_found`, `conflict`, `internal_error`; `error.message: string`; and optional `error.details: Record<string, unknown>`. | Changing error code taxonomy, adding UI-only error codes to the canonical body, or using UI-local/backend-local error body mirrors. | T1,T5,T6,T8,T13 |
| R5: Compatibility barrels | `src/types/ui.ts`, `ui/src/lib/contracts/uiReadModel.ts`, `ui/src/lib/contracts/uiActions.ts`, `ui/src/lib/contracts/uiEvents.ts`, `ui/src/lib/contracts/uiErrors.ts`, `ui/src/lib/types.ts` | Backend compatibility file `src/types/ui.ts` re-exports or consumes canonical read-model contracts without independent mirrors where that file already owns UI DTO compatibility. UI-local compatibility files cover action, event, error, and UI convenience re-export paths without requiring `src/types/ui.ts` to grow new action/event/error symbols. UI compatibility files may additionally keep UI-only view-state types such as `ConnectionStatus`, `BubbleCardModel`, and `BubblePosition` only when those types do not define backend/API payload shape, do not import covered rows from `src/v11/**` directly or transitively, and obey the Covered-Row Compatibility-Chain Rule. `src/shared/contracts/**` is not part of this task. | Keeping duplicated interfaces, duplicating literal tuples, direct UI imports from `src/v11/**`, UI-only view-state exceptions in backend compatibility files, adding action/event/error symbols to `src/types/ui.ts` solely for symmetry, or violations of the Covered-Row Compatibility-Chain Rule. | T2,T3,T4,T5,T6,T7,T8,T12,T13 |

### Call-Site Matrix

| ID | File | Required Change | Forbidden Change | Evidence |
|---|---|---|---|---|
| CS1 | `src/contracts/ui/index.ts` | Export the new read-model/action/event/error contract rows. | Hide the new rows behind legacy-only paths. | T1 |
| CS2 | `src/types/ui.ts` | Become the backend compatibility surface for UI DTOs, importing/re-exporting from canonical files. It may keep behavior-only helpers such as `mapPendingInboxItems` only when the helper signature names canonical UI contracts, including `UiPendingInboxItemSource` from `src/contracts/ui/uiReadModel.ts`, plus protocol-owned transit from `src/types/protocol.ts` when needed. | Keep independent canonical definitions after `src/contracts/ui/**` owns the row, keep direct imports from internal `src/v11/**` modules for UI contract authority, or export UI-only view-state types from the backend compatibility file. | T2,T6,T12 |
| CS3 | `ui/src/lib/types.ts` | Replace broad UI-local DTO/action/event/error mirrors with imports/re-exports from canonical contracts or direct UI-local barrels backed by them. Preserve UI-only view-state types (`ConnectionStatus`, `BubbleCardModel`, `BubblePosition`) as local if they are not API payload authority. If a UI-only view-state type extends or indexes a canonical DTO, its imports and any UI-local barrel it uses must still resolve to `src/contracts/ui/**` or other UI-only view-state types only; it must not regain `src/v11/**` through a transitive type dependency. | Direct or transitive `src/v11/**` type import for covered rows, structural mirror declarations, or UI-local literal tuples for backend-owned contract values. | T2,T3,T4,T5,T6,T7,T8 |
| CS4 | `src/v11/shared/ports/uiRouter.ts` | Align action input/result DTO references to canonical UI action/read-model contracts while preserving the router port as the owner of dependency signatures. `UiRouterDependencies` may mention canonical DTOs as function input/output types, but the dependency bag itself must remain a port/capability contract, not a canonical UI payload contract. | Move command behavior, parser semantics, filesystem/tmux/remote behavior, dependency bag ownership, runtime capability types, or action side effects into contract files. | T3,T6 |
| CS5 | `src/v11/infrastructure/ui/routerHttpBody.ts`, `src/v11/infrastructure/ui/routerActionDispatch.ts`, and `src/v11/infrastructure/ui/routerActions.ts` | Keep parsing behavior unchanged while ensuring parsed body/result shapes satisfy canonical action contracts; preserve empty-body handling, unknown-field dropping, required-field checks, and legacy-field rejection messages. | Change accepted payloads, malformed-body errors, side-effect order, or action dispatch routing as part of type migration. | T3,T9 |
| CS6 | `src/v11/infrastructure/ui/events.ts`, `eventsFilter.ts`, `eventsLog.ts`, `eventsSnapshot.ts`, `routerEvents.ts`, `eventsTypes.ts`, and `ui/src/lib/events.ts` | Align SSE event payload typing to canonical event contracts and ensure the UI parser recognizes the fixed emitted event union, including `repo.removed`. | Rename event kinds, change snapshot semantics, change reconnect/staleness/polling behavior, or introduce a second event assembly path. | T4,T6,T8,T10 |
| CS6a | `src/v11/infrastructure/ui/routerContracts.ts` | Consume canonical `UiApiErrorBody`, canonical read-model detail types, canonical action result types that appear in router contract exports, and canonical event/broker payload types where router contracts cross the UI API or SSE boundary. | Define an independent error body/detail/action/event DTO mirror or import covered UI contracts through `src/v11/**` as authority. | T1,T3,T4,T5,T6 |
| CS6b | `src/v11/infrastructure/ui/routerHttp.ts` and `src/v11/infrastructure/ui/routerHttpErrors.ts` | Consume canonical `UiApiErrorBody` through router HTTP error helpers and response writing paths. | Define an independent `UiApiErrorBody` mirror, change the error-code taxonomy, or route UI API errors through a non-canonical body shape. | T1,T5,T6 |
| CS6c | `ui/src/lib/api.ts` | Consume canonical UI action result and `UiApiErrorBody` contracts through the UI API client method signatures and response parsing paths. | Keep `Record<string, unknown>` result mirrors after a canonical result exists, define UI-local action/error DTOs, or import covered UI contract authority from `src/v11/**`. | T3,T5,T6,T8,T9 |
| CS7 | `src/v11/infrastructure/ui/presenters/bubblePresenter.ts` and `timelinePresenter.ts` | Ensure presented UI read-model objects satisfy canonical read-model contracts. `RuntimeSessionRecord` stays runtime-owned; `bubblePresenter.ts` performs only the narrow serializable projection or type assignment needed for `UiRuntimeSessionRecord`. Timeline lenient normalization may remain producer behavior, but its output type must be canonical. | Pull UI-only fallback heuristics into presenters, remove existing null/optional behavior, reinterpret protocol payloads, or move/rename runtime session registry types. | T2,T11 |
| CS8 | tests under `tests/contracts/**` | Extend parity and source-text guards to the broad contract rows, direct-import ban, event allowlist parity, action parser/result parity, compatibility-chain limits, producer-normalization placement, backend/UI view-state separation, traceability mirror checks, and UI consumer compilation coverage. | Remove coverage because imports share one source, or leave source guards covering only foundation/core rows. | T2-T13 |

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
5. If browser-safe canonical contracts need names currently owned only by
   `src/v11/**` modules, introduce only the specific UI-facing type or literal
   union needed by an in-scope DTO/action/event/error row. That row must live in
   `src/contracts/ui/**` unless it is protocol-owned transit already covered by
   `src/types/protocol.ts`. Do not promote whole internal module contracts,
   dependency ports, runtime capability types, or behavior helper APIs to
   shared/canonical ownership merely because the UI currently imports one of
   their names.
6. Capability-bag tiebreaker: when a type is both used by UI routing and also
   describes callable dependencies, filesystem/tmux/runtime capabilities, or
   command orchestration behavior, split out only the serializable UI payload
   DTOs into `src/contracts/ui/**`; leave the capability/dependency contract at
   the existing port or runtime owner.

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
5. Action dispatch routing remains owned by
   `src/v11/infrastructure/ui/routerActionDispatch.ts`. This task may align
   dispatch input/result DTO types to canonical UI action contracts, but it must
   not change the action-name to handler mapping, handler selection order,
   side-effect order, or error mapping path.
6. SSE event payloads keep the current event kind allowlist and snapshot shape.
   The canonical event row must describe emitted payloads, not introduce a
   second event assembly path.
7. UI read-model DTOs keep current nullability and optionality. If an internal
   runtime field is unavailable, producer code must continue to emit the same
   explicit `null`, omitted optional field, or existing fallback value that the
   current DTO already exposes.
8. Existing UI client return types that are currently `Record<string, unknown>`
   may be tightened only to the corresponding canonical router result type when
   the backend already returns that shape. Any such tightening must update every
   affected `ui/src/lib/api.ts` method signature and every TypeScript call site
   that consumes that method until `pnpm typecheck` and `pnpm --dir ui test`
   pass. Do not require a separate audit artifact, and do not use this migration
   to hide unmodeled backend responses behind broader `unknown` or `any`.
9. `ui/src/lib/events.ts` runtime validators must preserve their current
   observable depth per event kind: all parsed events keep discriminant/id/ts
   checks; `bubble.updated` and `bubble.removed` keep repoPath/bubbleId checks;
   `bubble.updated` keeps the shallow `isRecord(bubble)` check; `repo.updated`
   keeps the shallow `isRecord(repo)` check; `repo.removed` uses the narrow L0
   event-parser exception and checks only repoPath in addition to id/ts/type;
   `snapshot` keeps only array checks for `repos` and `bubbles`. Do not add
   deep nested DTO validation or reject payloads that the current validator
   accepts, except for the explicit `repo.removed` acceptance widening.

### Covered-Row Compatibility-Chain Rule

For covered UI contract rows, each `ui/src/lib/**` consumer must reach
`src/contracts/ui/**` through exactly one allowed route:

1. Direct import from `src/contracts/ui/**`.
2. Import from `ui/src/lib/types.ts` when that file directly re-exports the
   covered row from `src/contracts/ui/**`.
3. Import from one `ui/src/lib/contracts/<row>.ts` barrel when that barrel
   directly re-exports the covered row from `src/contracts/ui/**`.

An overlong chain is invalid if it uses both `ui/src/lib/types.ts` and
`ui/src/lib/contracts/<row>.ts`, any two UI-local barrel/compatibility files, or
any UI-local barrel that imports a covered row through another UI-local barrel.

### Traceability Update Rule

When an implementation changes any row in the Canonical Contract Matrix, update
only the mirrored statements that mention the same ownership, field role,
fallback behavior, or evidence obligation. This is a traceability rule, not a
request to duplicate every field list in every section.

1. L0 control-model bullets and scope boundary.
2. Plan Linkage.
3. Current Source Anchors.
4. Canonical Contract Matrix rows R1-R5.
5. Call-Site Matrix rows CS1-CS8, including CS6a, CS6b, and CS6c.
6. Ownership and Deferred Semantics.
7. Structured Input / Output Rules.
8. Covered-Row Compatibility-Chain Rule.
9. L2 Required Tests T1-T13.
10. Acceptance Criteria.
11. Validation Scope Notes.
12. Validation Order.
13. Parent plan Open Tasks summary if scope or status changes.

No mirrored surface may introduce a field role, fallback behavior, ownership
claim, or evidence obligation that is absent from the Canonical Contract Matrix.

## L2 - Verification Contract

### Required Tests

| ID | Command / Check | Required Coverage |
|---|---|---|
| T1 | `pnpm typecheck` | Canonical contracts compile from backend and UI import paths. |
| T2 | `pnpm exec vitest run tests/contracts/uiContractParity.types.ts` | Read-model DTO parity across canonical, backend compatibility, presenter/router output types, and UI consumer surfaces, including timeline protocol payload transit. |
| T3 | `pnpm exec vitest run tests/contracts/uiContractParity.types.ts` | UI action input/result parity for router port, parser-return types where exported or assertable, router dependency results, and UI API surfaces. |
| T4 | `pnpm exec vitest run tests/contracts/uiContractParity.types.ts` | SSE connected/event/snapshot payload parity for backend events and UI event consumers, including data event union parity for repo and bubble update/remove events. |
| T5 | `pnpm exec vitest run tests/contracts/uiContractParity.types.ts` | `UiApiErrorBody` parity and error-code taxonomy preservation. |
| T6 | `pnpm exec vitest run tests/contracts/uiContractTransitSource.test.ts` | Source guard proves no broad UI contract row is mirrored in `src/types/ui.ts` compatibility output, `ui/src/lib/types.ts`, or UI-local contract barrels; no direct UI import from `src/v11/**` remains for covered rows; every file under `src/contracts/ui/**` stays free of `src/v11/**`, `node:*`, `application/**`, `defaults/**`, and `infrastructure/**` imports except explicitly allowed imports from `src/types/protocol.ts`, `src/types/bubble.ts`, and sibling `src/contracts/ui/**` files; and covered-row import paths obey the Covered-Row Compatibility-Chain Rule. |
| T7 | `pnpm fitness:check:ci` | Boundary guard still rejects UI imports from internal runtime/application paths. |
| T8 | `pnpm --dir ui test` | UI API/event/type consumers still compile and pass local behavior tests for API client types, event client parsing, the narrow `repo.removed` parser acceptance required by the L0 event-parser exception, and UI-only view-state types that extend or index canonical DTOs. |
| T9 | `pnpm exec vitest run tests/contracts/uiContractTransitSource.test.ts` | Source/behavior guard for action parser compatibility: commit `auto` remains rejected in favor of `stageAll`; review-policy `metaReviewAutoReworkMinSeverity` remains rejected in favor of `reviewBlockingMinSeverity`; approve/rework/reply optional `refs` handling remains unchanged; merge/delete empty-body behavior remains unchanged; unknown request fields remain dropped rather than retained; required fields such as commit `stageAll`, message-bearing action `message`, and review-policy `reviewLoopMode` remain required. |
| T10 | `pnpm exec vitest run tests/contracts/uiContractTransitSource.test.ts` | Source/behavior guard for SSE stream compatibility: emitted stream event names remain `connected`, `snapshot`, `bubble.updated`, `bubble.removed`, `repo.updated`, `repo.removed`, and `heartbeat`; `heartbeat` stays transport-only; `repo.removed` parser acceptance is limited to the L0 event-parser exception; subscription filtering, history replay by `lastEventId`, and reconnect/fallback behavior are not changed by type alignment. The guard also proves `src/v11/infrastructure/ui/eventsLog.ts` remains the only factory path for non-snapshot `UiEvent` objects, `src/v11/infrastructure/ui/eventsSnapshot.ts` remains the snapshot factory path, and `src/v11/infrastructure/ui/routerEvents.ts` remains the only SSE writer path for those event names. |
| T11 | `pnpm exec vitest run tests/contracts/uiContractTransitSource.test.ts` | Source guard proves canonical read-model contract files contain no producer behavior functions or fallback/normalization helpers such as `present*`, `map*`, `normalize*`, `resolve*`, or `read*`; those remain in presenters, router/event producers, or protocol readers. |
| T12 | `pnpm exec vitest run tests/contracts/uiContractTransitSource.test.ts` | Source guard proves backend compatibility file `src/types/ui.ts` does not define or export UI-only view-state types such as `ConnectionStatus`, `BubbleCardModel`, or `BubblePosition`; those may exist only under `ui/src/lib/**`. |
| T13 | `pnpm exec vitest run tests/contracts/uiContractTransitSource.test.ts` | Traceability guard uses only extractable markdown structures: the `### Canonical Contract Matrix` table, the `### Call-Site Matrix` table, and the `### Required Tests` table. It uses exact file-path matches, not substring-only matches. Row-to-file binding is fixed as `uiReadModel -> src/contracts/ui/uiReadModel.ts + src/types/ui.ts + ui/src/lib/contracts/uiReadModel.ts + ui/src/lib/types.ts + src/v11/infrastructure/ui/routerContracts.ts`, `uiActions -> src/contracts/ui/uiActions.ts + ui/src/lib/contracts/uiActions.ts + ui/src/lib/types.ts + ui/src/lib/api.ts + src/v11/infrastructure/ui/routerContracts.ts`, `uiEvents -> src/contracts/ui/uiEvents.ts + ui/src/lib/contracts/uiEvents.ts + ui/src/lib/types.ts + ui/src/lib/events.ts + src/v11/infrastructure/ui/routerContracts.ts`, and `uiErrors -> src/contracts/ui/uiErrors.ts + ui/src/lib/contracts/uiErrors.ts + ui/src/lib/types.ts + ui/src/lib/api.ts + src/v11/infrastructure/ui/routerContracts.ts + src/v11/infrastructure/ui/routerHttp.ts + src/v11/infrastructure/ui/routerHttpErrors.ts`. It proves each row appears in `src/contracts/ui/index.ts`, its bound compatibility files, at least one call-site row, and at least one Required Test evidence row other than T13 itself. It fails if a parsed matrix row names a covered row absent from the Canonical Contract Matrix. |

### Acceptance Criteria

1. `src/contracts/ui/**` exports browser-safe canonical contracts for all
   in-scope broad UI rows per T1, with row-specific parity coverage in T2-T5.
2. `ui/src/lib/types.ts` no longer declares mirrored read-model/action/event/
   error DTOs for the in-scope rows per T2-T6, and UI-local contract barrels
   cannot reintroduce those mirrors.
3. `ui/src/lib/types.ts`, `ui/src/lib/api.ts`, and `ui/src/lib/events.ts` do
   not import `src/v11/**` directly for in-scope contract authority per T6-T8.
4. Backend router/presenter/event producers type-check against the same
   canonical contracts consumed by the UI per T1-T5 and T8.
5. Runtime behavior and payload semantics are preserved; changes are limited to
   contract authority and import path alignment, except for the explicit L0
   event-parser exception that allows `ui/src/lib/events.ts` to accept the
   already-emitted `repo.removed` event without changing backend runtime branch
   behavior per T8-T10.
6. Parity/source guard tests fail on reintroduced mirrors or violations of the
   Covered-Row Compatibility-Chain Rule. The backend compatibility file must
   also remain free of UI-only view-state exports per T12.
7. Action parser compatibility is explicitly guarded for legacy-field
   rejection, empty-body behavior, unknown-field dropping, optional `refs`, and
   required-field checks per T9.
8. SSE stream compatibility is explicitly guarded for the fixed event-name
   allowlist, transport-only heartbeat, limited `repo.removed` parser
   acceptance, filtering/history/reconnect behavior, and factory/writer
   uniqueness per T10.
9. Canonical read-model contract files remain free of producer behavior,
   fallback, or normalization helpers per T11.
10. Backend compatibility stays separate from UI-only view-state exports per
   T12.
11. Traceability guards prove each covered contract row has deterministic
   matrix, call-site, compatibility-file, and Required Test bindings per T13.

### Validation Scope Notes

1. `target_files` lists the expected edit surface for this task. Validation
   commands may read or execute incidental fixtures outside that list without
   expanding implementation scope.
2. If implementation requires editing a test, fixture, or helper outside
   `target_files`, update `target_files` in the same change or document why the
   file is generated/non-source validation output.

### Validation Order

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm exec vitest run tests/contracts/uiContractParity.types.ts tests/contracts/uiContractTransitSource.test.ts`
5. `pnpm --dir ui test`
6. `pnpm test`
7. `pnpm build`
