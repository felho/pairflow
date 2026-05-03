---
artifact_type: task
artifact_id: task_ui_router_port_closure_4_ui_readmodel_port_closure_v1
task_family_id: ui-readmodel-port-closure
sequence_key: "4"
task_id: 4-ui-readmodel-port-closure
title: "UI Read-Model Port Closure"
status: approved
phase: phase4
target_files:
  - src/contracts/ui/uiReadModel.ts
  - src/contracts/ui/index.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/ui/routerDependencies.ts
  - src/v11/infrastructure/ui/routerBubbleDetail.ts
  - src/v11/infrastructure/ui/eventsScan.ts
  - src/v11/infrastructure/ui/eventsFingerprint.ts
  - src/v11/infrastructure/ui/presenters/bubblePresenter.ts
  - ui/src/lib/types.ts
  - tests/contracts/uiContractParity.types.ts
  - tests/contracts/uiContractTransitSource.test.ts
  - tests/core/ui/router.test.ts
  - tests/core/ui/eventsScan.test.ts
  - tests/core/ui/eventsFingerprint.test.ts
  - tests/tools/fitness/uiRouterPortBoundary.test.ts
  - tools/fitness/policy.json
target_files_role: implementation_write_targets
prd_ref: null
plan_ref: plans/ui-router-port-closure-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-03-ui-router-port-closure-plan-v1
---

# Task: UI Read-Model Port Closure

## L0 - Policy

### Goal

Move list/status/inbox router-facing read-model shapes behind canonical
`src/contracts/ui/**` ownership and remove command-owned imports from the UI
router port and UI event scan/fingerprint read paths, while preserving existing
UI list, detail, inbox, timeline, remote-execution behavior, and event
refresh/fingerprint behavior.

### Domain / Control Model Summary

1. Business invariant: browser-facing read models must be owned by the UI
   contract surface, not by list/status/inbox command modules.
2. Control model: command-owned list/status/inbox APIs may remain internal
   producers; `src/contracts/ui/uiReadModel.ts` owns the shared UI/API DTO shape
   that the router port and frontend consume.
3. Read-path rule: backend adapters may read command-owned outputs and project
   them once into UI DTOs before crossing the UI router port.
4. Forbidden fallback: do not solve the import violation by renaming
   command-owned types, re-exporting them from `ports`, or weakening the fitness
   exception rule. Do not reconstruct missing UI detail from untyped
   `Record<string, unknown>` payloads in frontend code.
5. Allowed resolution path: introduce or complete explicit UI read-model DTOs,
   keep deterministic projection local to the infrastructure UI boundary, and
   remove every task-4 command-owned port exception matching
   `router-port-command-task4-*` once the port no longer imports those sources.
6. Missing-data rule: if a command-owned field has no UI contract equivalent,
   omit it or model it as explicit optional/null UI data with parity tests; do
   not hide it in a generic payload bag.
7. Phase boundary:
   - read-model closure: owned here for list/status/inbox router-facing DTOs.
   - event read-model consumer closure: owned here for event scan/fingerprint
     consumers of list DTOs.
   - producer closure: limited to projection from existing command outputs into
     UI DTOs; command semantics remain unchanged.
   - action DTO closure: already closed by task 3 and must not be reopened.
   - final guard zeroing for broad-bag aliases remains task 5.

### Plan Linkage

1. Parent plan gap closed: G3, `uiRouter.ts` imports command-owned
   list/status/inbox types.
2. Depends on: `2-router-dependency-slices`; may run after
   `3-ui-action-dto-closure`.
3. Unlocks / impacts successors: `5-router-port-cleanup`, which can remove any
   remaining transitional router-port exceptions only after this task lands.
4. Task-list impact: refines planned `4-ui-readmodel-port-closure`; no
   replacement.
5. Inherited validation / exit expectation: the UI router port no longer imports
   `src/v11/shared/list/listCommandContract.ts`,
   `src/v11/shared/inbox/inboxCommandApi.ts`, or
   `src/v11/shared/status/statusCommandApi.ts`; `src/contracts/ui/index.ts`
   re-exports only canonical UI read-model modules; event scan/fingerprint
   consumers no longer retain command-owned list contracts through router-port
   aliases; and parity/source tests prove the canonical UI read model remains
   shared by backend and frontend.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/ui-router-port-closure-plan-v1.md`
   - `docs/architecture/v11-ports-governance.md`
   - `docs/modularity-review/2026-05-02-modularity-review.md`
   - `src/contracts/ui/index.ts`
   - `src/contracts/ui/uiReadModel.ts`
   - `src/v11/shared/ports/uiRouter.ts`
   - `src/v11/infrastructure/ui/presenters/bubblePresenter.ts`
   - `src/v11/infrastructure/ui/eventsScan.ts`
   - `src/v11/infrastructure/ui/eventsFingerprint.ts`
   - `tests/contracts/uiContractParity.types.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
   - `tests/core/ui/eventsScan.test.ts`
   - `tests/core/ui/eventsFingerprint.test.ts`
   - `tests/tools/fitness/uiRouterPortBoundary.test.ts`
   - `tools/fitness/policy.json`
2. Canonical elements: `UiBubbleListEntry`, `UiBubbleListView`,
   `UiBubbleDetail`, `UiBubbleInbox`, `UiBubbleInboxItem`, status/detail
   summaries, and repo summary DTOs are UI/API-facing read-model contracts.
3. Guard elements: the UI router port boundary fitness policy and tests guard
   command-owned import leakage; they do not own DTO semantics.
4. Compat-only elements: command-owned `BubbleListEntry`, `BubbleStatusView`,
   `BubbleStatusInput`, `BubbleInboxInput`, and `BubbleInboxView` may be adapter
   inputs only.
5. Forbidden reinterpretations: do not change lifecycle state semantics, inbox
   item meaning, remote execution meaning, runtime health rules, or action result
   DTOs as part of this read-model closure.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `uiRouter.ts`, `uiReadModel.ts`,
   `bubblePresenter.ts`, `routerBubbleDetail.ts`, `routerDependencies.ts`,
   `eventsScan.ts`, `eventsFingerprint.ts`, contract parity tests,
   transit-source tests, UI event scan/fingerprint tests, and the UI router port
   fitness policy.
2. Actual touched scope: shared UI read-model contract shape plus infrastructure
   projection/wiring that currently lets command-owned types cross the port.
3. Mutation entrypoints in scope: none. This task is read-model/interface
   projection work; lifecycle command behavior and side effects are out of scope.
4. Hidden scope ruled out: action result DTO closure is task 3; final broad-bag
   cleanup is task 5; list/status/inbox command implementation behavior remains
   command-owned.
5. Why the declared task shape matches reality: the open fitness exceptions are
   exact command-owned imports from the port to list/status/inbox command
   modules, and the code already has canonical UI read-model DTOs that can own
   the browser-facing shape.

### Authority Boundary Map

1. Authority producer: list/status/inbox command modules and status/list
   collectors produce internal execution facts.
2. Stored authority: TypeScript UI contracts and API response shapes persist the
   browser-facing DTO boundary.
3. In-scope consumers: UI router port contracts, backend router/detail/list
   presenters, UI event scan/fingerprint infrastructure, frontend API/store type
   mirrors, and contract parity/source tests.
4. Explicit out-of-scope consumers: command CLI text output, Pairflow lifecycle
   internals, transcript storage, and action command result DTOs.
5. Export surfaces closed in this phase: list/status/inbox read-model exports
   consumed by UI router port and frontend API parity.

### Baseline Preservation

1. Must-preserve behaviors: list bubble counts, per-bubble summary fields,
   runtime health/attention, remote execution summary, detail inbox items,
   pending inbox counts, watchdog/detail transcript fields, and timeline payload
   behavior.
2. Allowed resolution paths: adapter/presenter functions may project internal
   command outputs into canonical UI DTOs; type aliases may move into
   `src/contracts/ui/uiReadModel.ts` when the UI owns the shape.
3. Forbidden regression interpretations: removing detail fields, changing inbox
   route/recommendation semantics, dropping remote execution data, or changing
   runtime expected/present/stale rules is not authorized.
4. Replacement proof required if removed: any field removed from a router-facing
   read model must be classified as out-of-contract and covered by parity/source
   tests showing it no longer crosses the UI boundary.

### Completion Proof Boundary

1. Current proof source: router port imports command-owned list/status/inbox
   types and fitness policy carries task-4 exceptions matching
   `router-port-command-task4-*`.
2. Target proof source: `src/contracts/ui/uiReadModel.ts` defines the UI
   read-model DTOs, `uiRouter.ts` imports only UI-owned read-model types for
   list/status/inbox surfaces, and those task-4 exceptions are removed.
3. Reused proof contract: UI contract parity and transit-source tests must keep
   backend canonical exports, router exports, and frontend types aligned.
4. Mixed-truth surfaces allowed: none at the UI router port; command-owned
   values may exist only before projection.

### In Scope

1. Define or complete canonical UI read-model DTOs for list, status/detail, and
   inbox router-facing shapes in `src/contracts/ui/uiReadModel.ts`.
2. Update `src/v11/shared/ports/uiRouter.ts` so it no longer imports
   command-owned list/status/inbox modules.
3. Update infrastructure presenters/adapters so command-owned outputs are
   projected into UI DTOs before crossing the port.
4. Update frontend/backend type parity and router tests for the new ownership.
5. Update UI event scan/fingerprint consumers so they depend on canonical UI
   list-view/list-entry DTOs, not port-local aliases or command-owned list
   contracts.
6. Remove the task-4 command-owned import exceptions from `tools/fitness/policy.json`
   and update targeted fitness tests.

### Out of Scope

1. Removing all remaining full dependency-bag aliases or broad composite
   exceptions.
2. Changing Pairflow lifecycle command behavior, transcript persistence, or
   runtime session semantics.
3. Revisiting task 3 action DTO fields.
4. Introducing a separate package for UI contracts.
5. CLI text-output formatting changes except where tests must adapt to unchanged
   canonical DTO names.

### Safety Defaults

1. Prefer preserving existing UI response fields under UI-owned DTO types.
2. Keep projection deterministic and local to the backend UI boundary.
3. Remove a fitness exception only after the corresponding import edge is gone.
4. Treat missing parity coverage as a blocker, not as a reason to loosen guards.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `3`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Split decision: keep as one bounded read-model closure because the producer
   commands remain unchanged and the in-scope work is one UI contract/projection
   boundary with existing parity tests.

## L1 - Implementation Contract

### Domain / Control Contract

| Clause | Contract | Priority | Timing |
|---|---|---|---|
| Business invariant | UI/API read models must be UI-owned DTOs, not command-owned module contracts. | P1 | required-now |
| Control model | Command modules produce internal facts; infrastructure presenters project them; UI contracts own exported read shape. | P1 | required-now |
| Read path | Frontend and router port read `src/contracts/ui/**`; only adapters may read command-owned list/status/inbox types. | P1 | required-now |
| Forbidden fallback | No command-owned re-export through `ports`, no generic payload-bag reconstruction, no broad fitness exception. | P1 | required-now |
| Missing data | Omit or explicitly optional/null fields with tests; do not infer hidden command state in UI consumers. | P1 | required-now |

### Call-Site Matrix

| ID | File / Surface | Current Role | Required Change | Priority | Tests |
|---|---|---|---|---|---|
| CS1 | `src/contracts/ui/uiReadModel.ts` | Owns many UI read-model DTOs but not all router port aliases. | Add/adjust canonical list/status/inbox DTO exports needed by the port. | P1 | T1,T3,T13 |
| CS2 | `src/contracts/ui/index.ts` | Barrel export for canonical UI contracts. | Re-export any newly added read-model DTOs from the canonical UI contract surface; do not re-export command-owned modules. | P1 | T1,T3,T12 |
| CS3 | `src/v11/shared/ports/uiRouter.ts` | Imports command-owned list/status/inbox types. | Import UI-owned read-model DTOs only for list/status/inbox surfaces. | P1 | T1,T2,T4,T5,T10 |
| CS4 | `src/v11/infrastructure/ui/presenters/bubblePresenter.ts` | Projects command outputs into UI summaries/detail. | Preserve or complete projection into canonical UI DTOs. | P1 | T4,T6,T7 |
| CS5 | `src/v11/infrastructure/ui/routerDependencies.ts` | Wires command APIs behind UI router dependencies. | Keep command APIs internal to dependency implementation; port type remains UI-owned. | P1 | T4,T6,T10 |
| CS6 | `src/v11/infrastructure/ui/routerBubbleDetail.ts` | Combines status, inbox, and runtime registry for detail responses. | Consume projected UI DTO contract without leaking command-owned types. | P1 | T6,T7 |
| CS7 | `src/v11/infrastructure/ui/eventsScan.ts` | Reads list view shape for remote-started detection. | Read canonical UI list view type or an adapter-local narrowed type. | P1 | T9,T11 |
| CS8 | `src/v11/infrastructure/ui/eventsFingerprint.ts` | Destructures list-entry fields and normalizes volatile remote execution timestamps for stable event fingerprinting. | Read canonical UI list-entry DTO or an adapter-local narrowed type; do not import list command contracts through the port. | P1 | T9,T11 |
| CS9 | `tools/fitness/policy.json` | Carries task-4 command-owned port exceptions matching `router-port-command-task4-*`. | Remove those exceptions after import edges are gone. | P1 | T5,T8 |
| CS10 | `ui/src/lib/types.ts` | Frontend mirror/parity consumer. | Keep frontend type parity with canonical backend read-model DTOs. | P1 | T1 |

### Data And Interface Contract

| Contract Surface | Current Shape | Target Shape | Explicitly Not Carried |
|---|---|---|---|
| `UiBubbleListEntry` | Alias to command-owned `BubbleListEntry` through the port. | UI-owned DTO in `src/contracts/ui/uiReadModel.ts` or an equivalent UI-owned export re-used by the port. | Command-only fields not rendered or returned by UI API. |
| `UiBubbleListView` | Port-local wrapper with `BubbleListEntry[]`. | UI-owned list view DTO with repo summary/counts/runtime/remote execution fields preserved. | CLI formatting-only fields. |
| `UiBubbleDetail` / status view | Port depends on command-owned `BubbleStatusView` for `getBubbleStatus`. | UI-owned status/detail DTOs cross the port; command status remains adapter input. | Raw command diagnostics not present in current UI detail contract. |
| `UiBubbleInbox` | Port depends on command-owned `BubbleInboxInput`/`BubbleInboxView`. | UI-owned inbox input/view or adapter-local command input hidden behind dependency implementation. | Transcript internals not surfaced as UI inbox fields. |
| `UiBubbleStatusInput` / `UiBubbleInboxInput` | Port currently exposes command-owned dependency input types for status and inbox. | UI-owned or port-local pure input DTOs with the existing `bubbleId`, optional `repoPath`, and optional `cwd` fields preserved; T10 parity/source tests must prove these dependency signatures no longer resolve to command-owned `BubbleStatusInput`, `BubbleStatusView`, `BubbleInboxInput`, or `BubbleInboxView`. | Command API-specific error or producer internals. |
| Fitness exceptions | Exact task-4 command import exceptions in policy. | No task-4 command-owned import exceptions remain for `uiRouter.ts`. | Broad allowlists or wildcard exceptions. |

Structured rules:

1. Unknown command fields are dropped unless explicitly added to
   `uiReadModel.ts`.
2. Optional UI fields must stay optional only when the current API can omit them.
3. Malformed or partial command output handling remains owned by existing command
   producers; this task does not introduce new runtime recovery semantics.
4. UI router port exported read-model types must resolve to
   `src/contracts/ui/**` or adapter-local pure DTOs, never command-owned modules.

### Side Effects Contract

| Surface | Allowed Side Effects | Forbidden Side Effects |
|---|---|---|
| Read-model projection | Pure mapping from command outputs to UI DTOs. | Lifecycle command execution, transcript mutation, runtime session mutation. |
| Fitness policy | Remove exact task-4 exceptions after import closure. | Weakening mode, broadening scope, or adding replacement exceptions for the same edges. |
| Source/failure guards | Add or tighten source/type assertions for T10, T11, and T12 ownership regressions. | Excluding `uiRouter.ts`, `eventsScan.ts`, `eventsFingerprint.ts`, or `src/contracts/ui/index.ts` from ownership scans. |
| Tests | Update expected type ownership and parity assertions. | Masking command-owned imports by excluding files from scan scope. |

### Error And Fallback Contract

| Case | Expected Behavior | Priority | Tests |
|---|---|---|---|
| Command-owned import reintroduced in `uiRouter.ts` | Fitness fails with command-owned import violation. | P1 | T5,T8 |
| Status/inbox command input/view types reintroduced into router dependency signatures | Transit-source/type parity fails because `UiRouterDependencies["getBubbleStatus"]` or `UiRouterDependencies["getBubbleInbox"]` resolves to command-owned input or view types. | P1 | T10 |
| Event scan/fingerprint retains command list contracts through port aliases | Transit-source or fitness coverage fails the event read-model ownership guard. | P1 | T11 |
| Event scan/fingerprint behavior regresses after DTO ownership change | Event unit tests fail remote-start refresh, update/removal emission, or stable remote fingerprint expectations. | P1 | T9 |
| UI barrel re-exports command-owned read-model modules | Transit-source tests fail when `src/contracts/ui/index.ts` exports `src/v11/shared/list/**`, `src/v11/shared/status/**`, or `src/v11/shared/inbox/**`. | P1 | T12 |
| UI detail lacks optional command field | Field is omitted or explicit null/optional in UI contract; frontend does not reconstruct from generic payload. | P1 | T3,T7 |
| Projection receives existing valid command output | Existing UI list/detail/inbox behavior is preserved. | P1 | T6,T7 |
| Future port file imports command-owned read model | Existing scan still fails unless a future explicit exception is justified elsewhere. | P1 | T8 |

### Dependency Constraints

1. `src/contracts/ui/**` must not import `src/v11/shared/list/**`,
   `src/v11/shared/status/**`, or `src/v11/shared/inbox/**`.
2. `src/v11/shared/ports/uiRouter.ts` must not import command-owned
   list/status/inbox modules after this task.
3. Infrastructure UI adapters may import command-owned modules as producer
   inputs, but their exported/router-facing types must be UI-owned.
4. Frontend mirrors must remain parity consumers, not independent contract
   authorities.
5. UI event scan/fingerprint infrastructure must consume either canonical UI
   list DTOs from `src/contracts/ui/**` or local narrowed DTOs with no
   command-owned import edge; it must not import `src/v11/shared/list/**`,
   `src/v11/shared/status/**`, or `src/v11/shared/inbox/**` directly, import
   command-owned list contracts indirectly through
   `UiBubbleListEntry` / `UiBubbleListView` aliases exported from `uiRouter.ts`,
   or otherwise preserve command-owned list contracts. Local narrowed DTOs are
   allowed only when declared in the event infrastructure module or imported
   from `src/contracts/ui/**`, and T11 transit-source/fitness coverage must fail
   if any command-owned or router-port-alias path returns.
6. Compat-only command-owned types (`BubbleListEntry`, `BubbleStatusInput`,
   `BubbleStatusView`, `BubbleInboxInput`, `BubbleInboxView`) may remain in
   command modules and adapter/presenter implementation files as producer
   inputs, but must not appear in `src/contracts/ui/**`,
   `src/v11/shared/ports/uiRouter.ts`, frontend mirrors, or event
   scan/fingerprint ownership surfaces.

### Shared Contract Compatibility

| Current Consumers | Additive vs Breaking | Alignment Owner |
|---|---|---|
| Backend UI router, frontend API types, contract parity tests, router tests. | Internal breaking type ownership change with preserved runtime JSON shape unless explicitly tested otherwise. | This task owns backend/frontend type alignment for list/status/inbox read models. |
| Command modules and CLI internals. | No command contract break intended. | Out of scope except adapter compile fixes. |

### Closure-Budget Summary

1. Buckets touched: `shared_contract`, `read_model_consumers`,
   `internal_adapter_projection`, and `guard_policy`.
2. Collapsed closures: UI read-model contract ownership and adapter projection
   are collapsed because the same router boundary owns the leak.
3. Deferred closures: final broad-bag and zero-exception cleanup remains task 5.
4. Why bounded: no persisted schema, lifecycle mutation, or activation behavior
   changes are introduced.

### Canonical Contract Matrix

| Row | Canonical Owner | Producer Input | UI Port Output | Success Proof | Guard |
|---|---|---|---|---|---|
| CCM1 | `src/contracts/ui/uiReadModel.ts` list DTOs | list command view | `UiBubbleListView` / entries from UI contract | Type parity and router list tests pass. | No `listCommandContract` import in `uiRouter.ts`. |
| CCM2 | `src/contracts/ui/uiReadModel.ts` status/detail DTOs | status command view | UI status/detail DTOs used by detail route | Detail/router tests preserve fields. | No `statusCommandApi` import in `uiRouter.ts`. |
| CCM3 | `src/contracts/ui/uiReadModel.ts` inbox DTOs | inbox command view | UI inbox DTOs used by detail route | Inbox counts/items parity tests pass. | No `inboxCommandApi` import in `uiRouter.ts`. |
| CCM4 | `tools/fitness/policy.json` | observed source imports | no task-4 exceptions | `pnpm fitness:check:ci` passes with removed exceptions. | Targeted fitness tests cover violation and clean current inventory. |
| CCM5 | `src/contracts/ui/uiReadModel.ts` list DTOs | list command view feeding event scan list-view input and event fingerprint list-entry input | canonical or local-narrowed event scan/fingerprint DTOs | Event scan/fingerprint tests preserve remote-start refresh, bubble update/removal event emission, and fingerprint stability. | No event infrastructure dependency on command list contracts via router-port aliases. |
| CCM6 | `src/contracts/ui/index.ts` UI barrel | canonical UI read-model exports | canonical UI barrel re-exports | Transit-source tests prove the barrel exports only canonical UI DTO modules. | T12 proves `src/contracts/ui/index.ts` re-exports no command-owned modules. |

### Ownership And Deferred Semantics

1. This task owns the UI read-model contract and projection boundary for
   list/status/inbox.
2. This task records command outputs as producer inputs but does not reinterpret
   command lifecycle semantics.
3. Task 5 owns any remaining broad-composite cleanup and final zero-exception
   proof that depends on both task 3 and task 4.
4. Frontend consumers own only parity updates needed to match canonical backend
   contracts; they must not add fallback reconstruction logic.

### Mirrored Surface Checklist

1. L0 control model and forbidden fallback.
2. L1 Data And Interface Contract.
3. L1 Canonical Contract Matrix.
4. Fitness policy/test expectations.
5. Contract parity and transit-source assertions.
6. Acceptance criteria and validation commands.
7. Event scan/fingerprint consumers and tests.
8. Side Effects Contract and Error And Fallback Contract source/failure guards.

### Test Matrix

| ID | Scenario | Setup | Expected Result | Priority | Timing | Test Type |
|---|---|---|---|---|---|---|
| T1 | canonical backend/frontend type parity | Type parity suite imports canonical read-model DTOs and frontend mirrors. | list/status/inbox UI read-model types remain equal across backend/router/frontend surfaces. | P1 | required-now | type test |
| T2 | UI router port import closure | Source scan reads `src/v11/shared/ports/uiRouter.ts`. | No imports from list/status/inbox command modules remain. | P1 | required-now | transit-source/fitness |
| T3 | UI contracts do not import command-owned read-model modules | Source scan reads `src/contracts/ui/**`. | No command-owned list/status/inbox source import exists in canonical UI contracts. | P1 | required-now | transit-source |
| T4 | adapter projection preserves list/detail/inbox behavior | Router tests exercise list and detail endpoints. | Response shape and key fields match existing UI behavior under UI-owned DTO types. | P1 | required-now | integration/unit |
| T5 | task-4 fitness exceptions removed | `tools/fitness/policy.json` has no `router-port-command-task4-*` exceptions. | Fitness still passes on current source. | P1 | required-now | fitness |
| T6 | runtime/remote fields preserved | List/detail fixtures include runtime health and remote execution data. | Projection preserves existing UI fields without command-owned type leakage. | P1 | required-now | unit/integration |
| T7 | inbox item semantics preserved | Detail fixture includes human question and approval request items. | Pending counts, item refs, recommendation, and gate route stay intact. | P1 | required-now | unit/integration |
| T8 | future command-owned port import fails | Fitness fixture adds command-owned import under scanned port scope. | Check fails unless exact future exception is added outside this task. | P1 | required-now | fitness |
| T9 | event scan/fingerprint consumers stay list-DTO aligned | `eventsScan` and `eventsFingerprint` tests use canonical UI list DTOs or local narrowed DTO fixtures. | Remote-start refresh detection still performs the second refreshed list read; bubble update/removal event emission still matches existing fixtures; fingerprint output ignores volatile remote timestamps while retaining stable remote/cache fields. | P1 | required-now | unit |
| T10 | status/inbox dependency input DTOs are UI-owned or pure local | Parity/source tests inspect `UiRouterDependencies["getBubbleStatus"]` and `UiRouterDependencies["getBubbleInbox"]` signatures. | Their input and result types no longer import or alias `BubbleStatusInput`, `BubbleStatusView`, `BubbleInboxInput`, or `BubbleInboxView` from command modules at the router port. | P1 | required-now | type/source |
| T11 | event scan/fingerprint import ownership guard | Transit-source or fitness coverage inspects `eventsScan.ts`, `eventsFingerprint.ts`, and any `UiBubbleListEntry` / `UiBubbleListView` imports used by them. | Event infrastructure cannot retain command-owned list contracts directly or through router-port aliases; any allowed local narrowed DTO has no command-owned import edge. | P1 | required-now | transit-source/fitness |
| T12 | canonical UI barrel export composition | Transit-source tests inspect `src/contracts/ui/index.ts`. | The barrel re-exports newly added UI read-model DTOs only from `src/contracts/ui/**` and does not re-export `src/v11/shared/list/**`, `src/v11/shared/status/**`, or `src/v11/shared/inbox/**` modules. | P1 | required-now | transit-source |
| T13 | canonical read-model DTO declaration ownership | Transit-source/type tests inspect `src/contracts/ui/uiReadModel.ts` declarations and exports. | List/status/inbox UI DTOs crossing the router port are declared or exported from the canonical UI read-model contract rather than reconstructed from command-owned modules. | P1 | required-now | type/source |

### Acceptance Criteria

1. `uiRouter.ts` no longer imports the three command-owned list/status/inbox
   modules named in the parent plan and policy exceptions; T2 verifies the
   source import closure.
2. Canonical UI read-model DTOs in `src/contracts/ui/uiReadModel.ts` own the
   list/status/inbox shapes crossing the router port; T13 verifies declaration
   and export ownership.
3. Existing runtime JSON behavior for list, detail, inbox, remote execution, and
   runtime health is preserved or explicitly tested as intentionally omitted.
4. Every task-4 command-owned import exception matching
   `router-port-command-task4-*` is removed from `tools/fitness/policy.json`.
5. Contract parity, transit-source, router, and fitness tests cover the new
   ownership boundary through T1, T2, T3, T4, T5, T8, T10, T11, T12, and T13:
   T4 anchors `tests/core/ui/router.test.ts`; T5/T8 anchor
   `tests/tools/fitness/uiRouterPortBoundary.test.ts` and
   `tools/fitness/policy.json`; T1/T2/T3/T10/T11/T12/T13 anchor the contract
   parity and transit-source checks.
6. Event scan/fingerprint consumers no longer rely on command-owned list
   contracts through the router port; T9 tests prove remote-start refresh,
   bubble update/removal event emission, and stable remote fingerprint behavior.
7. Status and inbox dependency signatures exposed by `UiRouterDependencies` use
   UI-owned or pure local DTOs, with T10 source/type tests proving no
   command-owned input or view types cross the port.
8. T11 transit-source/fitness coverage proves `eventsScan.ts` and
   `eventsFingerprint.ts` do not keep command-owned list contracts alive through
   router-port aliases.
9. T12 transit-source coverage proves `src/contracts/ui/index.ts` exports only
   canonical UI DTOs for this task's new read-model surface and does not
   re-export `src/v11/shared/list/**`, `src/v11/shared/status/**`, or
   `src/v11/shared/inbox/**` modules.

### Validation Plan

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm exec vitest run tests/contracts/uiContractTransitSource.test.ts tests/contracts/uiContractParity.types.ts tests/core/ui/router.test.ts tests/tools/fitness/uiRouterPortBoundary.test.ts`
   - Covers T1, T2, T3, T4, T5, T8, T10, T11, T12, and T13 where their
     assertions live in contract transit/parity, router, and fitness suites.
5. `pnpm exec vitest run tests/core/ui/eventsScan.test.ts tests/core/ui/eventsFingerprint.test.ts`
   - Covers T9 event behavior preservation.
6. `pnpm --dir ui test` when frontend mirrors or API tests change.
7. `pnpm test`
8. `pnpm build`
9. `pnpm --dir ui build` when `ui/src/**` changes.

## L2 - Implementation Notes

1. Prefer reusing existing `UiBubbleSummary`, `UiBubbleDetail`,
   `UiBubbleInbox`, and `UiRepoSummary` contracts before adding new names.
2. If command input types are still needed for dependency injection, keep them
   adapter-local in `routerDependencies.ts` or a presenter module rather than
   exporting them through `uiRouter.ts`.
3. Update transit-source tests before removing policy exceptions so failures
   point at the intended ownership rule.
4. Treat `BubbleStatusInput`, `BubbleStatusView`, `BubbleInboxInput`, and
   `BubbleInboxView` as command producer types that may be imported only inside
   adapter/presenter implementation files. `UiRouterDependencies` signatures are
   port-facing and should use UI-owned or port-local pure DTOs before projecting
   to `UiBubbleDetail`.
5. When replacing `UiBubbleListEntry` / `UiBubbleListView` aliases, update
   `eventsFingerprint.ts` alongside `eventsScan.ts`; both are list-view
   consumers even though only `eventsScan.ts` calls `listBubbles` directly. In
   event infrastructure, those names may be used only as canonical UI DTO names
   or local narrowed DTO names with no import edge to `uiRouter.ts` or command
   list contracts.

## Assumptions

1. Runtime response JSON should stay compatible unless the implementation proves
   a field was never a UI contract field.
2. The command-owned source modules remain valid internal producers after the
   UI boundary is closed.

## Open Questions

None blocking.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Consider extracting pure read-model projection helpers if any single presenter/adapter accumulates more than one of: list/status/inbox producer projection, event-scan list DTO narrowing, or `eventsFingerprint.ts` remote-execution normalization. | architecture | P3 | later-hardening | CreateTask | Evaluate after task 5 confirms final guard state; extract only if that measurable concentration exists. |

## CreateTask Summary

1. Contract-boundary override: yes, shared UI/API read-model contract ownership
   changes; `plan_ref` is present.
2. Complexity-risk decision: score 7, single task allowed because command
   producers stay unchanged and the router UI boundary is one bounded closure.
3. Contract-dense decision: yes; the canonical contract matrix is the source of
   truth for list/status/inbox ownership rows.
4. Inferred values: target files and test matrix were inferred from the parent
   plan, existing UI read-model contracts, current port imports, and fitness
   policy exceptions.
