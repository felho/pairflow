---
artifact_type: task
artifact_id: task_ui_router_port_closure_3_ui_action_dto_closure_v1
task_family_id: ui-action-dto-closure
sequence_key: "3"
task_id: 3-ui-action-dto-closure
title: "UI Action DTO Closure"
status: implementable
phase: phase3
target_files:
  - src/contracts/ui/uiActions.ts
  - src/contracts/ui/index.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/ui/routerDependencies.ts
  - src/v11/infrastructure/ui/routerContracts.ts
  - src/v11/infrastructure/ui/router.ts
  - ui/src/lib/types.ts
  - ui/src/lib/api.ts
  - tests/contracts/uiContractParity.types.ts
  - tests/contracts/uiContractTransitSource.test.ts
  - tests/core/ui/router.test.ts
  - ui/src/lib/api.test.ts
target_files_role: implementation_write_targets
prd_ref: null
plan_ref: plans/ui-router-port-closure-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 3-ui-action-dto-closure-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-03-ui-router-port-closure-plan-v1
---

# Task: UI Action DTO Closure

## L0 - Policy

### Goal

Replace UI action result contracts that expose raw internal
`BubbleStateSnapshot` or full `ProtocolEnvelope` values with explicit
UI-facing DTOs and projection coverage, while preserving existing UI action
behavior and frontend/backend type parity.

### Domain / Control Model Summary

1. Business invariant: browser-facing action results must describe the UI state
   and event facts the UI needs, not leak full orchestration/runtime models.
2. Control model: `src/contracts/ui/**` owns the UI/API-facing action DTO
   shape; lifecycle and protocol modules remain the authority for internal
   command execution and transcript/event persistence.
3. Read-path rule: router/action adapters may read internal command results and
   project them once into canonical UI DTOs; frontend code and router port
   contracts must read only the UI DTO surface.
4. Forbidden fallback: do not preserve raw `BubbleStateSnapshot` or full
   `ProtocolEnvelope` fields in UI action result contracts as compatibility
   truth, do not preserve raw-compatible `state` / `envelope` field names as
   replacement DTO carriers for affected raw-to-DTO families, and do not
   let frontend code reconstruct missing action state from untyped
   `Record<string, unknown>` payloads.
5. Allowed resolution path: introduce explicit UI action state and event DTOs,
   project internal state/envelope values at the backend boundary into named
   fields such as `actionState`, `event`, and `queuedIntent`, and keep
   optional/null/omitted fields explicit when the UI does not need the full
   internal model.
6. Missing-data rule: if an internal field has no UI contract equivalent, omit
   it with tests, or model it as an explicit optional/null UI field with tests;
   do not rehydrate hidden lifecycle state from event payloads.
7. Phase boundary:
   - contract closure: owned here for UI action result DTOs.
   - producer closure: owned here only for projection from existing action
     command results into UI DTOs.
   - internal execution closure: out of scope; lifecycle command semantics must
     remain unchanged.
   - workflow/orchestration closure: out of scope.
   - read-model closure: only action-result DTOs are in scope; list/status/inbox
     read-model relocation remains task 4.
   - activation closure: N/A.
   - cleanup/recovery closure: final transitional guard cleanup remains task 5.

### Plan Linkage

1. Parent plan gap closed: G4, UI action contracts expose raw internal
   model/event shapes.
2. Depends on: `2-router-dependency-slices`.
3. Unlocks / impacts successors: `5-router-port-cleanup`; may run independently
   of `4-ui-readmodel-port-closure` unless implementation touches the same
   contract exports.
4. Task-list impact: refines planned `3-ui-action-dto-closure`; no replacement.
5. Inherited validation / exit expectation: UI action result contracts no
   longer expose `BubbleStateSnapshot` or full `ProtocolEnvelope`, and parity
   tests prove frontend/backend agreement.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/ui-router-port-closure-plan-v1.md`
   - `docs/architecture/v11-ports-governance.md`
   - `docs/modularity-review/2026-05-02-modularity-review.md`
   - `src/contracts/ui/uiActions.ts`
   - `src/contracts/ui/uiReadModel.ts`
   - `src/v11/shared/ports/uiRouter.ts`
   - `tests/contracts/uiContractParity.types.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
2. Canonical elements: `src/contracts/ui/**` is the canonical UI/backend
   contract surface; action result DTOs must live there or be re-exported from
   there.
3. Guard elements: fitness and transit-source tests guard forbidden imports and
   parity; they are not a substitute for explicit DTO definitions.
4. Compat-only elements: internal command result objects, raw protocol
   envelopes, and raw bubble snapshots may be inputs to backend projection only.
5. Forbidden reinterpretations: do not claim task 4 read-model closure by moving
   list/status/inbox types here; do not change lifecycle command success,
   delivery, commit, merge, start, stop, or restart semantics.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `src/contracts/ui/uiActions.ts`,
   `src/v11/infrastructure/ui/routerActionDispatch.ts`, frontend API type
   parity tests, and the parent plan contract anchors.
2. Actual touched scope: contract closure plus producer-side projection at the
   router/action adapter boundary.
3. Mutation entrypoints in scope: UI HTTP action handlers that return action
   results; internal lifecycle command handlers are consumers/producers, not
   behavior targets.
4. Hidden scope ruled out: dependency-slice closure is already task 2;
   list/status/inbox read-model ownership is task 4; final guard zeroing is
   task 5.
5. Branch inventory note: cover immediate vs queued rework, approve/reply/commit
   event results, start/stop/restart state results, and merge/delete/open/attach
   results that already use UI-shaped data.
6. Field inventory note: before removing raw fields, classify each currently
   exposed `BubbleStateSnapshot` and `ProtocolEnvelope` member as one of:
   UI-required, projection-internal only, or out-of-contract. Only UI-required
   members may cross the action DTO boundary, and they must cross under named
   UI DTO fields rather than raw `state` / `envelope` compatibility fields.
   The out-of-contract set must be mirrored in the L1 DTO Field Contract
   `Explicitly Not Carried` column and asserted by acceptance tests.
7. Why the declared task shape matches reality: the task changes action result
   contract shape and projection tests while preserving the existing action
   dispatch branches and dependency methods.

### Authority Boundary Map

1. Authority producer: internal lifecycle command results and transcript events
   produce raw execution facts before projection.
2. Stored authority: TypeScript contracts and UI API responses persist the
   browser-facing DTO boundary.
3. In-scope consumers: backend UI router action response types, frontend API
   client types, frontend store/use sites covered by API tests, and contract
   parity tests.
4. Explicit out-of-scope consumers: Pairflow lifecycle internals, transcript
   storage, list/status/inbox read-model contracts, and final cleanup guards.
5. Export surfaces closed in this phase: UI action result exports in
   `src/contracts/ui/**` and router port/action result surfaces.

### Baseline Preservation

1. Must-preserve behaviors: existing HTTP action routes, action status codes,
   delivery fields, commit/merge details, start/stop/restart worktree/session
   fields, queued rework intent fields, and API client method signatures.
2. Allowed resolution paths: backend adapters may project internal state/events
   into smaller DTOs before returning them; frontend tests may update expected
   shape only where raw internal fields are intentionally removed.
3. Forbidden regression interpretations: removing an action branch, dropping
   delivery diagnostics, changing queued-vs-immediate rework semantics, or
   changing merge/delete/open/attach behavior is not authorized.
4. Replacement proof required if removed: any raw `state` or `envelope` field
   removal must be replaced by a named UI DTO field such as `actionState`,
   `event`, or `queuedIntent`, or explicitly proven unused and out of contract
   by parity/API tests.

### Success / Completion Proof Boundary

1. Current canonical success proof source: action command result objects returned
   through UI contracts, currently including raw state/envelope for several
   actions.
2. Target canonical success proof source: UI action result DTOs in
   `src/contracts/ui/uiActions.ts` plus projection tests.
3. Current canonical completion proof source: existing command result and router
   tests.
4. Target canonical completion proof source: contract parity, transit-source,
   router/API tests, and focused projection coverage.
5. Reused proof contract: existing UI contract parity between backend canonical
   exports, router exports, and frontend API types.
6. Proof-parity rule: `inherit_full_parity`.
7. Final truth surfaces affected: action result status/event/state DTO fields.
8. Mixed-truth surfaces allowed: none; raw internal values may exist only before
   projection.

### In Scope

1. Define explicit UI action state/event DTOs or similarly named UI-facing
   result fragments in `src/contracts/ui/uiActions.ts`.
2. Replace action result fields typed as `BubbleStateSnapshot` or full
   `ProtocolEnvelope` in UI contracts and router port exports.
3. Add projection helpers or adapter code at the backend UI boundary so runtime
   command results are converted once into UI DTOs.
4. Update frontend API/types/tests and backend router/contract tests to match
   the new UI DTO contract.
5. Update transit-source/fitness expectations so raw internal action result
   exposure cannot be reintroduced through UI contracts.

### Out of Scope

1. Moving list/status/inbox read-model types out of command-owned packages.
2. Removing all transitional fitness allowlists.
3. Changing Pairflow lifecycle command behavior or transcript persistence.
4. Refactoring dependency slices beyond what is needed to compile the new DTO
   projection boundary.
5. Introducing a separate package for UI contracts.

### Safety Defaults

1. Prefer additive named UI DTO fields before removing internal fields when the
   UI still consumes the information.
2. Keep projection deterministic and local to the backend UI boundary.
3. Preserve status codes and action branch selection.
4. Add tests before tightening import/fitness rules for this slice.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: internal UI/API action response interfaces and frontend
   API client types. `plan_ref` is non-null.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `3`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A
10. Identity/join note:
    - canonical identity path: action result DTO names exported from
      `src/contracts/ui/uiActions.ts`.
    - competing identifiers or fallback identities: raw internal
      `BubbleStateSnapshot` and `ProtocolEnvelope` must not remain UI contract
      identity.
11. Authority/source-of-truth note:
    - canonical source: `src/contracts/ui/**`.
    - forbidden secondary sources: frontend `Record<string, unknown>` parsing
      and raw command-owned model imports.
12. Closure-budget triage:
    - closure buckets touched: contract closure, producer-side projection,
      frontend/backend consumer alignment.
    - intentionally collapsed closures: projection plus consumer alignment,
      because the UI contract change cannot be validated without both sides.
    - explicitly deferred closures: read-model ownership and final guard cleanup.
13. Bounded-task-shape decision:
    - primary shape: `consumer_family_alignment`.
    - secondary shape: `contract_or_persisted_authority_foundation`.
    - why this bounded mix is safe: the producer behavior stays unchanged; only
      the UI-facing contract/projection and its consumers move together.
14. Contract-dense decision:
    - gate triggered: `yes`
    - trigger reasons: API/result shape, split ownership, downstream consumers,
      mirrored surfaces.
    - canonical matrix source: L1 section 0b.
    - mirrored surfaces: L0 policy, L1 contract tables, L2 acceptance tests,
      and Review Checklist.
15. Capability closure decision:
    - closure classification: `end_to_end` for the UI action DTO contract
      surface because the task aligns backend canonical contracts, router
      responses, frontend API types, and tests in the same slice.
    - activation path: existing UI action HTTP routes and frontend API client
      methods.
    - repo-provided boundary: TypeScript contracts, router/API tests,
      frontend API tests, and parity/transit-source checks.
    - external prerequisites: none.
    - last-mile proof: the validation plan runs the same API/client contract
      surfaces that implementation and UI consumers use.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | UI action results carry UI-facing state/event facts only. | Replace raw internal action result fields with DTOs. | P1 | required-now |
| Control model | `src/contracts/ui/**` owns browser/backend action contracts. | Router port and frontend import from canonical UI contracts. | P1 | required-now |
| Read-path rule | Internal command results are read only by backend projection code. | Frontend and router contracts do not import raw bubble/protocol types for action results. | P1 | required-now |
| Forbidden fallback | Raw `BubbleStateSnapshot`, full `ProtocolEnvelope`, raw-compatible replacement carrier names, and untyped frontend reconstruction are not UI fallback truth. | Tests must fail on reintroduced raw UI action result imports, raw-compatible `state` / `envelope` replacement DTO carriers for affected raw-to-DTO families, or frontend reconstruction from `Record<string, unknown>` / ad hoc payload parsing. | P1 | required-now |
| Allowed resolution path | Deterministic projection from internal command result to explicit UI DTO. | Projection helpers cover action state/event fields. | P1 | required-now |
| Missing-data rule | Omit or explicitly model optional/null fields; do not synthesize hidden lifecycle state. | DTO definitions and tests name omitted/optional behavior. | P1 | required-now |
| Phase boundary | Successor-owned read-model and cleanup work remains stable while action DTO closure proceeds. | Enforce task 4 list/status/inbox ownership and task 5 final guard cleanup as successor-owned boundaries. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| UI contract ownership | `src/contracts/ui/**` | Canonical browser/backend DTO source. | Preserve and extend. | P1 | required-now |
| Raw state/envelope exposure | `uiActions.ts`, parent plan G4 | Coupling concern to remove from action result contracts. | Replace with explicit DTO/projection. | P1 | required-now |
| List/status/inbox read models | parent plan G3/G4 split | Separate closure owned by task 4. | Do not move here. | P1 | required-now |

### 0b) Canonical Contract Matrix

| Action Result Family | Current Internal Exposure | Required UI DTO Direction | Deferred Semantics |
|---|---|---|---|
| approve / request-rework immediate / reply / commit | full `ProtocolEnvelope` plus `BubbleStateSnapshot` | `event` as `UiActionEvent` plus `actionState` as `UiActionBubbleState` | Internal transcript envelope remains lifecycle/protocol authority. |
| request-rework queued | `BubbleStateSnapshot` plus intent fields | `actionState` as `UiActionBubbleState` plus `queuedIntent` as `UiActionPendingReworkIntent` | Queue lifecycle interpretation remains command-owned. |
| start / stop / restart | `BubbleStateSnapshot` plus session/worktree fields | `actionState` as `UiActionBubbleState` plus existing session/worktree fields | Runtime state-machine behavior unchanged. |
| merge / delete / open / attach / review-policy delivery | already mostly UI-shaped | Preserve unless needed for type alignment | No task 4 read-model relocation. |

### 0c) DTO Field Contract

| DTO | Source Input | Required UI Fields | Explicitly Not Carried |
|---|---|---|---|
| `UiActionBubbleState` or equivalent | `BubbleStateSnapshot` | bubble identity, lifecycle state, round, active role/agent/since, last command timestamp, and only the execution-context identifiers the UI action result currently needs for follow-up display or routing. | full `execution_context`, full round role history, full meta-review snapshot, hidden lifecycle bookkeeping, and any field not proven UI-required. |
| `UiActionPendingReworkIntent` or equivalent | `BubbleStateSnapshot.pending_rework_intent` | intent id, mode/status facts, supersession facts, and display-safe message/ref facts already exposed by queued rework behavior. | command-owned queue internals that the UI does not display or send back. |
| `UiActionEvent` or equivalent | `ProtocolEnvelope` | event id, timestamp, sender/recipient/type, round, refs, and display-safe payload facts such as summary/message/question/decision when the action result contract needs them. | full `ProtocolEnvelope`, unbounded payload metadata, raw findings payloads, and event fields used only by protocol replay. |

Field naming must make the replacement intentional. Use
`actionState` / `event` / `queuedIntent` (or similarly explicit names) for
fields that replace raw `state` / `envelope` exposure; do not keep
raw-compatible `state` / `envelope` field names for those replacement DTO
carriers. The affected raw-to-DTO families are approve / request-rework
immediate / reply / commit, request-rework queued, and start / stop / restart.
This naming rule does not rename fields in the already UI-shaped
merge/delete/open/attach/review-policy delivery branch unless a field is being
used as a replacement carrier for raw internal state or envelope data.

### 0d) Mirrored Surface Checklist

When a row in the Canonical Contract Matrix or DTO Field Contract changes,
mirror the effect into these dependent surfaces in the same task before
approval or implementation handoff:

1. L0 Domain / Control Model Summary.
2. L0 Scope Reality / Shape Proof field inventory.
3. L0 Baseline Preservation.
4. L1 Domain / Control Contract.
5. L1 Canonical Contract Preservation.
6. L1 Shared Contract Compatibility, including barrel export rows such as
   `src/contracts/ui/index.ts`.
7. L1 Baseline Preservation.
8. L1 Implementation Requirements.
9. L1 Acceptance Criteria.
10. L1 Validation Plan.
11. L2 Execution Notes.
12. Review Checklist.

### 0e) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `src/contracts/ui/uiActions.ts` action result exports | router ports, frontend API types, parity tests | breaking | Replace raw fields with named UI DTOs and align consumers in same task. | N/A |
| `src/contracts/ui/index.ts` UI barrel exports | backend compatibility imports, frontend contract re-exports, parity/transit-source tests | re-export alignment | Re-export the canonical action DTOs from `uiActions.ts` without redefining or aliasing raw internal result shapes. | N/A |
| `src/v11/shared/ports/uiRouter.ts` action dependency result types | router dependencies and action dispatch | breaking internally | Import canonical UI result DTOs, preserve dependency method behavior. | N/A |
| Router infrastructure action surfaces | `routerActionDispatch.ts`, `routerDependencies.ts`, `routerContracts.ts`, `router.ts` | producer/projection alignment | Apply projection at dispatch/dependency boundaries, preserve route behavior, and keep router contracts typed to canonical UI DTOs. | N/A |
| frontend API action methods and type exports | `ui/src/lib/api.ts`, `ui/src/lib/types.ts`, tests, stores/components by type import | breaking if raw fields used | Update expected response shape and re-export canonical UI DTO types without frontend-side raw reconstruction, raw-shape redefinition, or aliasing of internal action result shapes. | N/A |

### 0f) Baseline Preservation

| Behavior | Preservation Rule | Test Expectation | Priority | Timing |
|---|---|---|---|---|
| Action branch routing | Existing action names and status-code branches stay unchanged. | Router/API tests continue to pass. | P1 | required-now |
| Delivery diagnostics | Approval delivery result fields remain UI-visible where currently exposed. | API/contract tests cover accepted/rejected variants. | P1 | required-now |
| Queued rework | `mode`, `intentId`, and supersession fields stay explicit. | Queued-result type parity remains covered. | P1 | required-now |
| Commit/start/stop/restart details | Commit SHA/message/files and session/worktree fields remain available. | Existing frontend API tests are updated only for state DTO shape. | P1 | required-now |

### 1) Implementation Requirements

1. Add explicit UI DTO types for action event/state facts in
   `src/contracts/ui/uiActions.ts`, or reuse existing canonical UI read-model
   DTOs only when they are already UI-owned and do not import command-owned
   action internals.
2. Replace direct `BubbleStateSnapshot` and full `ProtocolEnvelope` fields in
   UI action result exports with the new DTOs under explicit replacement
   carriers such as `actionState`, `event`, and `queuedIntent`; do not retain
   raw-compatible `state` / `envelope` field names for those replacement
   carriers.
3. Add projection logic at the backend UI boundary, preferably near action
   dispatch/dependency adaptation, so internal command result objects are
   converted before crossing the router/API seam.
4. Update `src/contracts/ui/index.ts`, router port exports, router contracts,
   `router.ts`, router dependencies, and dependency method result types to use
   or re-export the canonical UI action DTO result types without redefining raw
   aliases.
5. Update frontend API tests and contract parity tests to prove the browser
   surface matches the canonical backend DTO surface.
6. Update transit-source/fitness checks so `src/contracts/ui/uiActions.ts` no
   longer imports `BubbleStateSnapshot` or full `ProtocolEnvelope`, and so
   UI action results cannot reintroduce raw-compatible `state` / `envelope`
   replacement carrier field names for the affected raw-to-DTO families.
7. Projection helpers must be typed against raw internal command outputs on
   their input side and canonical `src/contracts/ui/uiActions.ts` DTOs on their
   output side. They must not return `unknown`, `Record<string, unknown>`, or
   assertion-cast DTOs for any in-scope action-result projection. Backend
   projection helpers must also not recover missing UI facts from generic
   payload metadata, untyped `Record<string, unknown>` values, or ad hoc payload
   parsing; any such fact must be modeled as an explicit DTO source field or
   omitted/optional/null with tests.
8. Action dispatch must call raw-to-DTO projection once per affected raw-to-DTO
   dispatch branch. Avoid duplicating state/event field selection separately in
   router tests, frontend API helpers, or UI components. Preserve-only
   merge/delete/open/attach/review-policy delivery branches are not required to
   run raw-to-DTO projection; they must be covered by tests proving their
   already UI-shaped result surface remains unchanged.
9. Frontend updates must remain thin transport/client alignment. The frontend
   may consume the new DTO fields, but it must not reconstruct missing state or
   event facts from generic payload metadata, untyped
   `Record<string, unknown>` values, or other ad hoc payload parsing.

### 2) Acceptance Criteria

1. `src/contracts/ui/uiActions.ts` has no direct or indirect action-result
   contract dependency on `BubbleStateSnapshot` from `../../types/bubble.js`,
   full `ProtocolEnvelope` from `../../types/protocol.js`, or aliases/re-exports
   that resolve to those raw internal shapes.
2. Action result types expose explicit UI DTO fields whose names communicate
   UI state/event purpose, using canonical replacement names such as
   `actionState`, `event`, and `queuedIntent` for affected raw-to-DTO families.
3. `tests/core/ui/router.test.ts` proves router action responses preserve
   action names, HTTP status selection, delivery diagnostics, queued-vs-immediate
   rework facts, commit/start/stop/restart details, and merge/delete/open/attach
   behavior, with only the intentional raw-field replacement changing the
   response body shape.
4. Frontend/backend parity tests compile against the same canonical DTO shape.
5. `ui/src/lib/api.test.ts` and `tests/contracts/uiContractParity.types.ts`
   pass after updating expected action result shape. `ui/src/lib/api.test.ts`
   proves frontend API transport consumes the canonical DTO fields without ad
   hoc payload reconstruction. `tests/contracts/uiContractParity.types.ts`
   proves `ui/src/lib/types.ts` type exports consume canonical DTO fields
   without raw-shape redefinition or aliasing of internal action result shapes.
6. No implementation changes claim closure for list/status/inbox read-model
   ownership or final zero-exception cleanup.
7. `tests/contracts/uiContractTransitSource.test.ts` asserts that UI action
   contracts do not contain direct or aliased action-result dependencies on
   `BubbleStateSnapshot`, full `ProtocolEnvelope`, raw `envelope:` result
   fields, or raw-compatible `state: BubbleStateSnapshot` result fields, and
   rejects raw-compatible action-result replacement DTO carriers named `state`
   or `envelope` for the affected raw-to-DTO families named in L1 0b and
   governed by L1 0c: approve / request-rework immediate / reply / commit,
   request-rework queued, and start / stop / restart. Already UI-shaped
   merge/delete/open/attach/review-policy delivery branches remain allowed
   under the L1 0c carve-out only when no field is being used as a replacement
   carrier for raw internal state or envelope data, and their preservation is
   asserted by AC #8.
8. `tests/core/ui/router.test.ts` covers projected HTTP responses for each
   affected action-result family in the Canonical Contract Matrix: event plus
   state results for approve/request-rework-immediate/reply/commit, queued
   rework state plus explicit intent fields, start/stop/restart state results,
   and preservation of already UI-shaped merge/delete/open/attach/review-policy
   delivery results without `state` / `envelope` replacement carriers. This is
   the AC-bound test anchor for the L1 0c preserve-only carve-out.
9. `tests/contracts/uiContractParity.types.ts`, `tests/core/ui/router.test.ts`,
   and `ui/src/lib/api.test.ts` prove queued rework fields remain explicit and
   are not hidden inside the projected action state.
10. `tests/contracts/uiContractTransitSource.test.ts`,
   `tests/contracts/uiContractParity.types.ts`, and focused router/API tests
   assert the `Explicitly Not Carried` boundaries from L1 0c: full
   `execution_context`, full round role history, full meta-review snapshot,
   hidden lifecycle bookkeeping, any field not proven UI-required, unbounded
   payload metadata, raw findings payloads, full `ProtocolEnvelope`, event
   fields used only by protocol replay, and command-owned queue internals do not
   cross the UI action result contract unless later modeled as explicit
   optional/null UI fields in this same contract with focused tests for the
   optional/null behavior.

### 3) Validation Plan

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm vitest run tests/contracts/uiContractParity.types.ts tests/contracts/uiContractTransitSource.test.ts tests/core/ui/router.test.ts`
5. `pnpm --dir ui test -- src/lib/api.test.ts`
6. `pnpm test`
7. `pnpm build`
8. `pnpm --dir ui build`
9. Validation evidence must include the focused contract/router/API assertions
   for the named DTO carriers and `Explicitly Not Carried` omissions when this
   task is implemented as code.

## L2 - Execution Notes

1. Start by adding characterization tests around the current action result
   shape and contract transit-source checks.
2. Inspect `ui/src/**` and router/API tests for direct `state`, `envelope`, and
   `payload.metadata` reads before deciding the final DTO field set.
3. Introduce DTO/projection types before changing router/frontend consumers.
4. Put projection next to the backend UI action boundary, with a narrow helper
   such as `projectUiActionState` / `projectUiActionEvent` if the existing file
   layout supports it. The helper should be local to UI infrastructure unless a
   second backend boundary proves shared ownership.
5. Keep projection code mechanical and avoid broad router dependency refactors.
6. When removing raw fields, inspect frontend use sites before assuming a field
   is unused.
7. Update tests in this order for fast feedback: transit-source guards,
   type-parity compile checks, focused router action response tests, frontend
   API tests.
8. If task 4 has already modified shared UI exports in a parallel branch, align
   only through canonical `src/contracts/ui/**` exports and avoid duplicate DTO
   aliases.

## Review Checklist

1. Does every removed raw internal field have an explicit UI DTO replacement or
   a tested omission?
2. Are lifecycle semantics unchanged for approve, rework, reply, commit, merge,
   start, stop, restart, and delete?
3. Do frontend/backend parity tests prove the same result shape?
4. Did the task avoid list/status/inbox read-model relocation and final guard
   cleanup?
5. Are projection functions deterministic and locally testable?
6. Is every DTO field selected from a documented UI need rather than copied
   wholesale from `BubbleStateSnapshot` or `ProtocolEnvelope`, as required by
   AC #10?
7. Do transit-source guards fail if a future change reintroduces raw action
   result `state` / `envelope` fields?
8. Do the L0 forbidden-fallback rule, L1 implementation requirements,
   acceptance criteria, and tests all enforce the same replacement carrier names
   and the same raw-to-DTO family scope covered by AC #2 and AC #7?
9. Do tests assert every L1 0c `Explicitly Not Carried` boundary instead of only
   checking that DTO replacement fields exist?
10. Do `src/contracts/ui/index.ts`, router port exports, router contracts,
   `router.ts`, router dependencies, and frontend type re-exports all expose or
   route the canonical `uiActions.ts` DTOs without redefining raw aliases?
11. Do preserve-only merge/delete/open/attach/review-policy delivery branches
   have tests proving they remain already UI-shaped without being forced through
   raw-to-DTO projection?
