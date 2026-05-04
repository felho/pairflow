---
artifact_type: task
artifact_id: task_read_event_validation_v1
task_family_id: read-event-validation
sequence_key: "3b"
task_id: 3b-read-event-validation
title: "Read and Event Response Validation"
status: approved
phase: phase3b
target_files:
  - src/v11/infrastructure/ui/routerActions.ts
  - src/v11/infrastructure/ui/routerEvents.ts
  - src/v11/infrastructure/ui/eventsSnapshot.ts
  - src/v11/infrastructure/ui/eventsLog.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/contracts/ui/uiReadModel.ts
  - src/contracts/ui/uiEvents.ts
  - tests/core/ui/router.test.ts
  - tests/core/ui/server.integration.test.ts
  - tests/core/ui/events.test.ts
prd_ref: null
plan_ref: plans/ui-contract-boundary-hardening-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
  - docs/architecture/ui-contract-governance.md
  - plans/ui-contract-boundary-hardening-plan-v1.md
  - plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/3a-action-response-validation.md
owners:
  - "felho"
doc_bubble_id: 3b-read-event-validation-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-04-ui-contract-boundary-hardening-plan-v1
---

# Task: Read and Event Response Validation

## L0 - Policy

### Goal

Add runtime validation for selected UI read/status/detail/timeline response
payloads and selected UI SSE event payloads at explicit backend UI router or
event-emission seams. Keep this separate from mutation/action validation because
read responses and event streams have different failure and fallback semantics.

This task is a specification artifact only until approved and executed. It does
not authorize implementation inside this document creation pass.

### Domain / Control Model Summary

1. Business invariant: UI-visible read and event payloads must not silently
   drift through `unknown` JSON or SSE emission paths.
2. Control model: `src/contracts/ui/**` owns browser-safe read/event shapes;
   `src/v11/**` owns runtime reads, presenters, and event production.
3. Read-path rule: backend router and event code may validate against canonical
   contract shapes but must not define UI-local mirror DTOs.
4. Forbidden fallback: do not accept malformed required read/event fields
   because browser parsing, test fixtures, or UI rendering currently tolerates
   them.
5. Allowed resolution path: existing presenter/projection code may continue to
   build read models, then the selected payload is validated at the router or
   event-emission boundary before it is sent to the client.
6. Missing-data rule: missing required selected read/event fields fail closed;
   optional or nullable fields remain accepted only where canonical contract
   shape allows them.
7. Phase boundary:
   - read-model closure: selected list/detail/timeline response validation.
   - event-stream closure: selected SSE snapshot and bubble update validation.
   - action closure: out of scope and already handled by task `3a`.
   - final drift/fitness hardening: out of scope and owned by task `4`.

### Plan Linkage

1. Parent plan gap closed: read/status/detail/event responses can still pass
   through JSON or event paths without explicit validation.
2. Depends on: archived task
   `plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/3a-action-response-validation.md`.
3. Unlocks / impacts successors: task `4-contract-drift-tests` can enforce the
   final import rule and representative validation failure paths after this
   task lands.
4. Task-list impact: creates planned task `3b-read-event-validation`; it does
   not replace or obsolete another task id.
5. Inherited validation / exit expectation: prove selected invalid read/event
   payloads fail loudly while valid current list/detail/timeline/SSE payloads
   keep their current contract shape.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/architecture/ui-contract-governance.md`
   - `plans/ui-contract-boundary-hardening-plan-v1.md`
   - `src/contracts/ui/uiReadModel.ts`
   - `src/contracts/ui/uiEvents.ts`
   - `src/contracts/ui/index.ts`
   - `src/v11/infrastructure/ui/routerActions.ts`
   - `src/v11/infrastructure/ui/routerEvents.ts`
   - `src/v11/infrastructure/ui/eventsSnapshot.ts`
   - `src/v11/infrastructure/ui/eventsLog.ts`
2. Canonical elements:
   - `UiBubbleListView`
   - `UiBubbleDetail`
   - `UiTimelineEntry`
   - `UiSnapshotEvent`
   - `UiBubbleUpdatedEvent`
   - `UiBubbleRemovedEvent`
   - `UiRepoUpdatedEvent`
   - `UiRepoRemovedEvent`
   - `UiEventsConnectedPayload`
3. Guard elements:
   - validators/adapters prove boundary conformance and do not become a second
     contract authority.
4. Compat-only elements:
   - existing router test fixtures and UI client parsing remain consumers only.
5. Forbidden reinterpretations:
   - do not change read-model DTO fields or SSE event names unless required to
     expose an already-canonical shape through `src/contracts/ui/**`;
   - do not treat action nested event DTOs from task `3a` as SSE stream events;
   - do not add browser-side fallback parsing in this task.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/infrastructure/ui/routerActions.ts`
   - `src/v11/infrastructure/ui/routerEvents.ts`
   - `src/v11/infrastructure/ui/eventsSnapshot.ts`
   - `src/v11/infrastructure/ui/eventsLog.ts`
   - `src/contracts/ui/uiReadModel.ts`
   - `src/contracts/ui/uiEvents.ts`
   - `tests/core/ui/router.test.ts`
   - `tests/core/ui/server.integration.test.ts`
   - `tests/core/ui/events.test.ts`
2. Actual touched scope: fail-closed hardening for selected read response and
   selected SSE event production boundaries.
3. Read entrypoints in scope:
   - `GET /api/bubbles`
   - `GET /api/bubbles/:bubbleId`
   - `GET /api/bubbles/:bubbleId/timeline`
4. Event entrypoints in scope:
   - `GET /api/events` connected payload and initial `snapshot`
   - emitted `bubble.updated`, `bubble.removed`, `repo.updated`, and
     `repo.removed` events.
5. Hidden scope ruled out: mutation/action response validation, browser client
   parser validation, command execution internals, watcher scan behavior, and
   broad final fitness policy.
6. Branch inventory note: valid selected read response, malformed selected read
   response, valid selected SSE event, malformed selected SSE event, and
   existing not-found/bad-request read errors must be represented.
7. Why the declared task shape matches reality: these selected payloads are
   emitted through router JSON or SSE write boundaries after existing
   projection/read logic has already produced UI-facing values.

### Authority Boundary Map

1. Authority producer: runtime status/list/timeline/event broker code produces
   raw or presented data.
2. Stored authority: canonical TypeScript UI contract source under
   `src/contracts/ui/**`; no persisted schema or database authority changes.
3. In-scope consumers: backend UI router JSON and SSE response paths.
4. Explicit out-of-scope consumers: browser API parsers, UI stores/components,
   mutation/action dispatch paths, and final import/fitness drift checks.
5. Export surfaces closed in this phase: selected backend read/event validation
   helpers may be introduced only behind the existing canonical UI contract
   boundary.

### Baseline Preservation

1. Must-preserve behaviors:
   - list, detail, and timeline routes keep current HTTP success status and
     response envelope names;
   - `/api/events` keeps the current SSE event names and heartbeat behavior;
   - existing bad request, not found, and repo-scope errors keep their mapping;
   - valid optional/null fields remain accepted where canonical contracts allow
     them.
2. Allowed resolution paths:
   - existing presenters and event builders may continue constructing payloads;
   - selected router/event emitters may call validators before sending.
3. Forbidden regression interpretations:
   - do not convert a malformed selected payload into a partial successful
     response;
   - do not make SSE heartbeat data carry a contract payload;
   - do not conflate list summary shape with detail-only fields.

### Success / Completion Proof Boundary

1. Current canonical success proof source: selected read/event producers return
   objects that are sent as JSON or SSE payloads.
2. Target canonical success proof source: selected payloads pass runtime
   validation against canonical UI-visible read/event contracts before emission.
3. Current canonical completion proof source: runtime read/event scan logic owns
   freshness and event generation.
4. Target canonical completion proof source: unchanged; this task validates
   emitted payload shape only.
5. Proof-parity rule: `inherit_full_parity` for existing valid payload shapes.
6. Final truth surfaces affected: selected HTTP read response bodies and
   selected SSE event `data:` payloads.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `fail_closed_hardening`.
2. Secondary shape: `consumer_family_alignment`, limited to aligning backend
   read/event emitters with canonical UI contract shape.
3. Preconditions before side effects: existing request and repo-scope checks
   remain before reads; validation happens after read/projection and before
   response emission.
4. Side effects forbidden before preconditions pass: existing repo-scope errors
   must still block before read execution.
5. Invalid payload behavior: invalid selected read response becomes a
   fail-closed router error; invalid selected SSE event is not emitted as a
   trusted event and must surface through the existing event error/logging path
   or an explicit fail-closed stream handling decision documented by the
   implementation.
6. Coordination primitives in scope: none.

### In Scope

1. Validate selected list, detail, and timeline response payloads before HTTP
   success emission.
2. Validate selected SSE connected/snapshot/bubble/repo event payloads before
   stream emission.
3. Preserve current valid response envelopes and SSE event names.
4. Add focused tests for valid current payload preservation and invalid selected
   payload failure.

### Out of Scope

1. Mutation/action response validation already covered by task `3a`.
2. Browser-side JSON or SSE parser validation.
3. Command execution, lifecycle state-machine, watcher scan, or tmux behavior.
4. Broad runtime schema coverage for every UI DTO.
5. Final import/fitness hardening owned by task `4-contract-drift-tests`.

### Safety Defaults

1. Fail closed on malformed selected read/event payloads: no successful HTTP
   read response and no trusted malformed SSE event.
2. Preserve successful payload shape exactly unless canonical UI contracts
   already require a stricter shape.
3. Keep validators as guards over canonical contracts, not new contract
   authority.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - HTTP read response shape: selected list/detail/timeline bodies.
   - SSE event payload shape: connected, snapshot, bubble, and repo events.
   - Error/fallback behavior: invalid selected payloads fail closed instead of
     silently passing through response emission.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `4`
8. `single-task allowed`: `yes`
9. Identity/join note: selected response identity remains request
   `repoPath`/`bubbleId` and event payload `repoPath`/`bubbleId`; validation
   must not rematch identities from alternate sources.
10. Authority/source-of-truth note: canonical source is `src/contracts/ui/**`
    for browser-safe shape and `src/v11/**` for runtime reads/events.
11. Closure-budget triage:
    - closure buckets touched: shared contract guard, read/event response
      producer, backend response consumer at router/SSE seam.
    - collapsed closures: validator wiring and selected response production
      because they are the same emission boundary.
    - deferred closures: browser parser fallback and final fitness drift policy.
12. Contract-dense decision:
    - gate triggered: `yes`.
    - canonical matrix source: `L1 0h Canonical Contract Matrix`.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Selected UI read/event payloads must not silently drift through response emission. | Validate selected JSON and SSE payloads before they are sent. | P1 | required-now |
| Control model | `src/contracts/ui/**` owns browser-safe shape; `src/v11/**` owns runtime reads/events. | Validators guard conformance without redefining runtime ownership. | P1 | required-now |
| Read-path rule | Use canonical UI contract exports for UI-visible shapes. | No UI-local DTO or schema mirror. | P1 | required-now |
| Forbidden fallback | Browser parsing, fixture shape, and UI rendering are not fallback truth. | Missing required fields fail validation. | P1 | required-now |
| Allowed resolution path | Existing presenters/event builders can remain producers. | Validate their selected output at the emission seam. | P1 | required-now |
| Missing-data rule | Required selected fields fail closed; optional/null fields follow canonical contracts. | Tests must include malformed required data and accepted nullable data where relevant. | P1 | required-now |
| Phase boundary | 3b owns read/event validation only. | Do not reopen mutation/action validation or final drift fitness. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `UiBubbleListView` | `src/contracts/ui/uiReadModel.ts` | Canonical list response view. | Preserve and validate selected emitted shape. | P1 | required-now |
| `UiBubbleDetail` | `src/contracts/ui/uiReadModel.ts` | Canonical detail response view inside current response envelope. | Preserve and validate selected emitted shape. | P1 | required-now |
| `UiTimelineEntry` | `src/contracts/ui/uiReadModel.ts` | Canonical timeline entry shape. | Preserve and validate selected timeline array entries. | P1 | required-now |
| `UiSnapshotEvent` | `src/contracts/ui/uiEvents.ts` | Canonical snapshot SSE payload. | Preserve and validate before snapshot emission. | P1 | required-now |
| `UiBubbleUpdatedEvent` / `UiBubbleRemovedEvent` | `src/contracts/ui/uiEvents.ts` | Canonical bubble SSE payloads. | Preserve and validate selected emitted events. | P1 | required-now |
| `UiRepoUpdatedEvent` / `UiRepoRemovedEvent` | `src/contracts/ui/uiEvents.ts` | Canonical repo SSE payloads. | Preserve and validate selected emitted events. | P1 | required-now |
| `UiEventsConnectedPayload` | `src/contracts/ui/uiEvents.ts` | Connected payload is SSE setup data, not a snapshot. | Preserve current shape and validate. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints | `routerActions.ts`, `routerEvents.ts`, `eventsSnapshot.ts`, `eventsLog.ts`, contract files, router/event tests. | These files define the read/event response seam and proof surface. | P1 | required-now |
| Actual touched scope | Fail-closed hardening at selected JSON/SSE emission boundaries. | Do not change runtime scan, command execution, or UI client parsing. | P1 | required-now |
| Read entrypoints | List, detail, and timeline GET routes. | Tests must hit HTTP/router path or direct handler seam. | P1 | required-now |
| Event entrypoints | Connected, snapshot, bubble, and repo SSE events. | Tests must prove valid emission and at least one malformed event failure path. | P1 | required-now |
| Hidden scope ruled out | Action responses, browser parser, final fitness policy. | Successor tasks remain viable. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Read/event wire-shape drift can silently pass through JSON/event paths. | Add explicit selected response validation. | P1 | required-now |
| Depends on | `3a-action-response-validation` archived. | Preserve the action validation seam already added. | P1 | required-now |
| Unlocks successors | `4-contract-drift-tests`. | Leave final import/fitness policy for the successor. | P1 | required-now |
| Task-list impact | Creates `3b-read-event-validation`. | No supersession. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `UiBubbleListView` / `UiBubbleDetail` / `UiTimelineEntry` | backend UI router, UI API/client types, router tests | additive | Add runtime validation for existing shape. | Broad drift fitness in task `4`. |
| `UiEvent` / `UiSnapshotEvent` / connected payload | backend UI events broker, SSE route, UI event consumers, events tests | additive | Add runtime validation for existing shape. | Browser parser validation remains out of scope. |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Valid list response envelope | preserve | Router/integration test keeps current JSON shape. | P1 | required-now |
| Valid detail response envelope | preserve | Router/integration test keeps current JSON shape. | P1 | required-now |
| Valid timeline response envelope | preserve | Router/integration test keeps current JSON shape. | P1 | required-now |
| Valid connected and snapshot SSE events | preserve | Event/SSE test keeps current event names and payload shape. | P1 | required-now |
| Existing bad-request/not-found read errors | preserve | Existing error mapping tests remain green. | P1 | required-now |
| Malformed selected read/event payload as success | forbid | Invalid-payload tests prove fail-closed behavior. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| List HTTP response | dependency/presenter returns value | runtime validation passes for selected list view | canonical result guarded by validator | no | P1 | required-now |
| Detail HTTP response | `loadBubbleDetail` returns value | runtime validation passes for selected detail view | canonical result guarded by validator | no | P1 | required-now |
| Timeline HTTP response | timeline reader returns entries | runtime validation passes for selected timeline entries | canonical result guarded by validator | no | P1 | required-now |
| SSE event payload | events broker emits event | runtime validation passes for selected event payload | canonical event guarded by validator | no | P1 | required-now |
| Runtime freshness/event generation | existing scanner/broker logic | unchanged scanner/broker logic | out-of-scope runtime truth | no | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| Invalid repo query or bubble id | Existing request/repo-scope parsing | Read dependency call | Existing 4xx/404 behavior. | P1 | required-now |
| Valid request, invalid selected read result | HTTP 2xx response emission | Emitting partial successful read body | Fail closed with router error; no successful result body. | P1 | required-now |
| Valid stream, invalid selected event payload | SSE trusted event write | Emitting malformed trusted event | Drop/fail closed through explicit stream handling and test the chosen behavior. | P1 | required-now |

### 0h) Canonical Contract Matrix

| ID | Condition / Input | Owner | Output / Status | Reason / Error Code | Retained / Dropped Data | Side Effects | Required Test |
|---|---|---|---|---|---|---|---|
| CCM1 | Valid list response matches selected `UiBubbleListView` envelope. | current task | HTTP 200 with unchanged `repo` and `bubbles` body. | N/A | Retain canonical fields. | Read only. | T1 |
| CCM2 | List response missing or malforms required selected fields. | current task | Fail-closed router error, not 2xx. | `internal_error` with `details.reasonCode: "UI_READ_RESPONSE_INVALID"` and response family. | Drop malformed success body. | Read attempt may have completed. | T2 |
| CCM3 | Valid detail response matches selected `UiBubbleDetail` envelope. | current task | HTTP 200 with unchanged `bubble` body. | N/A | Retain canonical fields. | Read only. | T3 |
| CCM4 | Detail response missing or malforms required selected fields. | current task | Fail-closed router error, not 2xx. | `internal_error` with `details.reasonCode: "UI_READ_RESPONSE_INVALID"` and response family. | Drop malformed success body. | Read attempt may have completed. | T4 |
| CCM5 | Valid timeline response entries match `UiTimelineEntry`. | current task | HTTP 200 with unchanged `timeline` body. | N/A | Retain canonical fields. | Read only. | T5 |
| CCM6 | Timeline entry missing or malforms required selected fields. | current task | Fail-closed router error, not 2xx. | `internal_error` with `details.reasonCode: "UI_READ_RESPONSE_INVALID"` and response family. | Drop malformed success body. | Read attempt may have completed. | T6 |
| CCM7 | Valid connected/snapshot SSE payload. | current task | Stream writes current event names and data shape. | N/A | Retain canonical fields. | SSE connection remains open per current behavior. | T7 |
| CCM8 | Valid bubble/repo SSE update or removal event. | current task | Stream writes current event name and data shape. | N/A | Retain canonical fields. | Event notification already occurred. | T8 |
| CCM9 | Selected SSE event payload is malformed. | current task | Malformed trusted event is not emitted; chosen fail-closed stream behavior is explicit. | `UI_EVENT_PAYLOAD_INVALID` or documented equivalent. | Drop malformed trusted event payload. | No extra runtime mutation. | T9 |
| CCM10 | Mutation/action response is encountered. | predecessor task `3a` | No validation change in this task. | N/A | N/A | N/A | T10 |

### 0i) Ownership and Deferred Semantics

| Surface / Decision | Owned By This Task | Emits / Records Only | Deferred Owner | Forbidden Interpretation / Fallback | Priority | Timing |
|---|---|---|---|---|---|---|
| Selected read response validation | yes | N/A | N/A | Do not delegate selected read validity to UI casts. | P1 | required-now |
| Selected SSE event validation | yes | N/A | N/A | Do not emit malformed event data as trusted stream data. | P1 | required-now |
| Runtime freshness/scanning | no | selected payload is consumed after scan/read | existing events/read runtime | Do not redefine watcher freshness or lifecycle meaning. | P1 | required-now |
| Browser interpretation | no | validated payload is emitted | UI client/store consumers | Do not add UI-local fallback parsing. | P1 | required-now |
| Final drift/fitness hardening | no | validation evidence produced | task `4-contract-drift-tests` | Do not widen this task into final policy. | P2 | required-later |

### 0j) Structured Contract Rules

| Structured Contract | Required Fields | Optional Fields | Allowed Top-Level Fields / Variants | Unknown / Malformed Behavior | Retention / Drop Rule | Fallback Status / Reason | Priority | Timing |
|---|---|---|---|---|---|---|---|---|
| List response envelope | `repo`, `bubbles` | none unless already canonical | current router body fields only | missing/wrong-type required selected fields fail | valid fields retained; invalid body not emitted as success | `UI_READ_RESPONSE_INVALID` | P1 | required-now |
| Detail response envelope | `bubble` | none unless already canonical | current router body fields only | missing/wrong-type selected detail fields fail | valid fields retained; invalid body not emitted as success | `UI_READ_RESPONSE_INVALID` | P1 | required-now |
| Timeline response envelope | `bubbleId`, `repoPath`, `timeline` | none unless already canonical | current router body fields only | malformed selected timeline entries fail | valid entries retained; invalid body not emitted as success | `UI_READ_RESPONSE_INVALID` | P1 | required-now |
| `UiEvent` SSE payloads | event-specific required fields from `uiEvents.ts` | event-specific canonical optionals only | `connected`, `snapshot`, `bubble.updated`, `bubble.removed`, `repo.updated`, `repo.removed`, `heartbeat` | selected malformed payloads fail or are dropped by explicit behavior; heartbeat remains payload-free | valid event data retained; malformed trusted event not emitted | `UI_EVENT_PAYLOAD_INVALID` or documented equivalent | P1 | required-now |

### 0k) Mirrored Surface Checklist

| Canonical Matrix Row | Mirrored Surfaces | Required Alignment Rule | Summary-Only Surface? | Verification |
|---|---|---|---|---|
| CCM1-CCM6 | L0 goal/scope, L1 data/error contract, tests, L2 acceptance | Read valid/invalid behavior must stay aligned with selected read contracts. | L0 is summary-only. | T1-T6, L2 A1-A4 |
| CCM7-CCM9 | L0 event scope, L1 structured rules, tests, L2 acceptance | SSE valid/invalid behavior must stay aligned with selected event contracts. | L0 is summary-only. | T7-T9, L2 A5-A6 |
| CCM10 | L0 out-of-scope, L1 ownership/deferred semantics | Mutation/action validation remains owned by 3a. | yes | T10, L2 A7 |

### 1) Call-Site Matrix

| Entrypoint / File | Current Role | Required Change | Priority | Timing |
|---|---|---|---|---|
| `src/v11/infrastructure/ui/routerActions.ts` | Builds list/detail/timeline response bodies. | Validate selected read response bodies before returning HTTP success. | P1 | required-now |
| `src/v11/infrastructure/ui/routerEvents.ts` | Writes connected, snapshot, event, and heartbeat SSE frames. | Validate selected event payloads before writing trusted event data. | P1 | required-now |
| `src/v11/infrastructure/ui/eventsSnapshot.ts` | Builds initial snapshot payload. | Preserve snapshot shape; add validation only if this is the narrowest seam. | P1 | required-now |
| `src/v11/infrastructure/ui/eventsLog.ts` | Stores and replays UI events. | Preserve replay order and filter behavior while validating selected emitted payloads. | P2 | conditional |
| `src/v11/shared/ports/uiRouter.ts` | Types read dependencies. | Preserve port shape unless a validator helper needs a typed boundary. | P2 | conditional |
| `src/contracts/ui/uiReadModel.ts` | Canonical selected read contracts. | Preserve shape; export validator-adjacent types only if needed. | P1 | required-now |
| `src/contracts/ui/uiEvents.ts` | Canonical selected SSE contracts. | Preserve event names and payload shapes. | P1 | required-now |
| `tests/core/ui/router.test.ts` | Router-level read/action proof. | Add selected read valid/invalid tests. | P1 | required-now |
| `tests/core/ui/server.integration.test.ts` | HTTP/SSE integration proof. | Preserve current HTTP/SSE success behavior and add representative invalid proof if needed. | P1 | required-now |
| `tests/core/ui/events.test.ts` | Event broker proof. | Add selected event validation failure proof where the seam is broker-local. | P1 | required-now |

### 2) Data and Interface Contract

1. Selected response validators must accept current canonical valid payloads for
   list, detail, timeline, connected, snapshot, bubble update/removal, and repo
   update/removal.
2. Missing required selected fields must fail validation.
3. Wrong primitive types must fail validation.
4. Unsupported literal values must fail validation for selected state/event
   names where canonical contracts define a closed literal set.
5. Timeline response validation must validate the response envelope and selected
   entry fields before HTTP 200 emission.
6. SSE validation must not alter event ordering, replay filtering, or heartbeat
   cadence.
7. Any helper public within backend code must have an explicit typed boundary.

### 3) Side Effects Contract

1. This task must not add command, lifecycle, watcher, or tmux side effects.
2. Existing request validation and repo-scope checks must remain before read
   dependency calls.
3. Response validation happens after selected read/event production and before
   emission.
4. Validation failure must not trigger retry, cleanup, rollback, or follow-up
   mutation.
5. No new coordination primitives are allowed.

### 4) Error and Fallback Contract

1. Invalid selected read payloads must fail closed and must not return HTTP
   2xx.
2. Invalid selected read payloads should use HTTP `internal_error` with stable
   `details.reasonCode: "UI_READ_RESPONSE_INVALID"` and a stable selected
   response family.
3. Invalid selected SSE event payload behavior must be explicit and tested:
   either fail the stream before writing a trusted malformed event, or drop the
   malformed trusted event with a stable diagnostic reason such as
   `UI_EVENT_PAYLOAD_INVALID`.
4. Existing request/repo-scope/not-found failures must keep their current
   behavior.
5. Browser parsing/casting is not a fallback validation layer.

### 5) Dependency Constraints

1. Preserve task `2b` entrypoint/boundary result and task `3a` action
   validation result.
2. Do not introduce a runtime dependency that makes browser bundles import
   Node-only backend code.
3. Prefer local validator functions if no schema library is already in the
   toolchain.
4. Do not edit package files unless implementation review explicitly widens
   scope.

### 6) Test Matrix

| ID | Scenario | Expected Proof | Priority | Timing |
|---|---|---|---|---|
| T1 | Valid list response. | HTTP 200 and unchanged current `repo`/`bubbles` JSON shape. | P1 | required-now |
| T2 | List response missing/malforming selected required field. | Non-2xx fail-closed router error with `UI_READ_RESPONSE_INVALID`. | P1 | required-now |
| T3 | Valid detail response. | HTTP 200 and unchanged current `bubble` JSON shape. | P1 | required-now |
| T4 | Detail response missing/malforming selected required field. | Non-2xx fail-closed router error with `UI_READ_RESPONSE_INVALID`. | P1 | required-now |
| T5 | Valid timeline response. | HTTP 200 and unchanged `timeline` entry shape. | P1 | required-now |
| T6 | Timeline response missing/malforming selected entry field. | Non-2xx fail-closed router error with `UI_READ_RESPONSE_INVALID`. | P1 | required-now |
| T7 | Valid connected and snapshot SSE payloads. | Current event names and payload shape preserved. | P1 | required-now |
| T8 | Valid bubble/repo update or removal event. | Current event name and payload shape preserved. | P1 | required-now |
| T9 | Malformed selected SSE event payload. | Malformed trusted event is not emitted; stable failure/drop diagnostic is asserted. | P1 | required-now |
| T10 | Action response path. | Existing 3a tests remain green; no new action validation scope here. | P1 | required-now |

## L2 - Acceptance Contract

### Acceptance Criteria

1. Selected list, detail, and timeline HTTP read responses are validated at an
   explicit backend router or presenter seam before successful emission.
2. Selected connected, snapshot, bubble update/removal, and repo update/removal
   SSE payloads are validated at an explicit event emission seam before trusted
   event data is written.
3. Valid selected read/event payloads preserve current JSON envelope names, SSE
   event names, and accepted optional/null field behavior.
4. Invalid selected read payloads fail closed with HTTP `internal_error`, stable
   `details.reasonCode: "UI_READ_RESPONSE_INVALID"`, and do not return 2xx.
5. Invalid selected SSE event payload behavior is explicit, tested, and does not
   emit malformed data as a trusted event.
6. The task preserves the UI contract boundary: canonical UI contract shapes
   stay under `src/contracts/ui/**`, and no UI-local DTO/schema mirror is
   introduced.
7. Mutation/action response validation is not implemented here and remains the
   completed responsibility of task `3a`.
8. Focused tests cover valid and invalid selected response paths, including at
   least one invalid response per selected read family and one invalid selected
   SSE event family.

### Verification Commands

1. Run `pnpm typecheck`.
2. Run `pnpm lint`.
3. Run `pnpm fitness:check:ci`.
4. Run the narrow affected router/events tests, including
   `tests/core/ui/router.test.ts`, `tests/core/ui/server.integration.test.ts`,
   and `tests/core/ui/events.test.ts`.
5. Run `pnpm test`.
6. Run `pnpm build` because Pairflow CLI/runtime source changes under `src/**`
   are expected in the implementation bubble.

### ReviewTask Focus

1. Check that the selected read/event validation seams are narrow and explicit.
2. Check that read response validation and SSE event validation remain separate
   where their failure semantics differ.
3. Check that task `4` still owns final drift/fitness enforcement.
4. Check metadata consistency with
   `plans/ui-contract-boundary-hardening-plan-v1.md`.

### Assumptions

1. The selected read/event validation scope starts with list, detail, timeline,
   connected, snapshot, bubble update/removal, and repo update/removal payloads.
2. The implementation may choose whether malformed SSE event data closes the
   stream or is dropped with diagnostics, but it must not be emitted as trusted
   event data.

### Open Questions

None blocking.

### Approval Provenance

Approved by delegated `ReviewSpec` task-mode review in the
`ExecutePairflowPlan` route ledger for the latest
`plans/tasks/3b-read-event-validation.md` artifact.

### Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Browser-side parser validation for selected read/event payloads. | UI client | P2 | later-hardening | Scope boundary | Consider only after backend emission validation lands. |
| HB2 | Broader schema coverage for all UI read/event DTOs. | backend UI contracts | P2 | later-hardening | Plan non-goal | Evaluate after task `4` drift tests define the final prevention boundary. |
