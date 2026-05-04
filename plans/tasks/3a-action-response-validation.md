---
artifact_type: task
artifact_id: task_action_response_validation_v1
task_family_id: action-response-validation
sequence_key: "3a"
task_id: 3a-action-response-validation
title: "Action Response Validation"
status: implementable
phase: phase3a
target_files:
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/ui/routerActions.ts
  - src/v11/defaults/ui/routerDefaults.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/contracts/ui/uiActions.ts
  - src/contracts/ui/deleteBubble.ts
  - tests/core/ui/router.test.ts
  - tests/contracts/uiContractTransitSource.test.ts
prd_ref: null
plan_ref: plans/ui-contract-boundary-hardening-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
  - docs/architecture/ui-contract-governance.md
  - plans/ui-contract-boundary-hardening-plan-v1.md
  - plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/2b-ui-import-migration.md
owners:
  - "felho"
doc_bubble_id: 3a-action-response-validation-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-04-ui-contract-boundary-hardening-plan-v1
---

# Task: Action Response Validation

## L0 - Policy

### Goal

Add runtime validation for selected UI mutation/action response payloads at one
explicit backend UI router or dispatch seam. Start with delete, commit, and
merge action results. Include same-dispatch siblings only when they can use the
exact same validation adapter shape without widening semantics.

This task is a specification artifact only until approved and executed. It does
not authorize implementation inside this document creation pass.

### Domain / Control Model Summary

1. Business invariant: UI-visible action response payload shape must be owned by
   the backend UI contract surface and must not silently drift through
   `unknown` router dispatch results.
2. Control model: `src/contracts/ui/**` is canonical for browser-safe response
   shape; `src/v11/**` owns runtime behavior and side effects; the backend UI
   router seam owns fail-closed validation before emitting HTTP success.
3. Read-path rule: action response validation must read UI-visible contract
   expectations from the canonical UI contract surface. If a UI-visible
   contract import is needed from implementation code, use
   `@pairflow/ui-contracts` only where the existing tooling permits it;
   otherwise preserve the backend canonical `src/contracts/ui/**` source import.
4. Forbidden fallback: do not accept malformed required response fields because
   TypeScript types, UI client casts, or downstream browser rendering would
   tolerate them. Do not add UI-local schema mirrors.
5. Allowed resolution path: deterministic projection from runtime command
   results to canonical UI action DTOs may stay in the existing backend UI
   default/projector path when the projected object is then validated at the
   router/dispatch boundary.
6. Missing-data rule: missing required selected action result fields fail closed
   before a 2xx HTTP action response is returned. Optional fields remain
   accepted only when the canonical UI contract marks them optional or nullable.
7. Phase boundary:
   - contract closure: preserve existing UI contract authority; add validation
     adapters only for selected action response shapes.
   - producer closure: validate selected action response production at the UI
     router seam.
   - internal execution closure: preserve command execution side effects and
     command result ownership.
   - workflow/orchestration closure: out of scope except for same-dispatch
     action result validation.
   - read-model closure: out of scope; task `3b` owns read/status/detail.
   - activation closure: tests prove selected invalid payloads fail closed and
     selected valid payloads keep current success responses.
   - cleanup/recovery closure: preserve delete/merge cleanup result meanings;
     do not add cleanup recovery behavior.

### Plan Linkage

1. Parent plan gap closed: mutation/action responses lack explicit validation at
   key UI seams.
2. Depends on: archived task
   `plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/2b-ui-import-migration.md`.
3. Unlocks / impacts successors: task `3b-read-event-validation` remains
   responsible for read/status/detail and SSE event validation; task
   `4-contract-drift-tests` can later harden representative validation failure
   coverage.
4. Task-list impact: creates planned task
   `3a-action-response-validation`; it does not replace or obsolete another
   task id.
5. Inherited validation / exit expectation: prove delete, commit, and merge
   action payload drift fails at the router seam while valid current responses
   stay compatible with canonical UI contracts.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/architecture/ui-contract-governance.md`
   - `plans/ui-contract-boundary-hardening-plan-v1.md`
   - `src/contracts/ui/uiActions.ts`
   - `src/contracts/ui/deleteBubble.ts`
   - `src/contracts/ui/index.ts`
   - `src/v11/shared/ports/uiRouter.ts`
   - `src/v11/infrastructure/ui/routerActionDispatch.ts`
   - `src/v11/defaults/ui/routerDefaults.ts`
   - `tests/core/ui/router.test.ts`
2. Canonical elements:
   - `UiCommitBubbleResult`
   - `UiMergeBubbleResult`
   - `UiDeleteBubbleResult` as the UI action alias for
     `DeleteBubbleResult`
   - `DeleteBubbleArtifacts`
   - shared nested action DTOs used by selected action results:
     `UiActionEvent`, `UiActionBubbleState`, and
     `UiActionExecutionContextRef`
3. Guard elements:
   - runtime validators and validation adapters prove boundary conformance but
     do not become a second contract authority;
   - delete validation must validate the canonical `DeleteBubbleResult`
     structure through the exported `UiDeleteBubbleResult` alias, not by
     inventing a parallel delete DTO;
   - HTTP status selection for delete confirmation remains a router guard over
     `requiresConfirmation` and `deleted`.
4. Compat-only elements:
   - UI client generic JSON casts and UI-local compatibility barrels are
     consumers only; they must not define response validity.
5. Forbidden reinterpretations:
   - do not change required/optional fields or literal unions in
     `src/contracts/ui/**` unless required only to export an existing
     canonical shape through the established UI contract boundary;
   - do not treat command-internal `state` or `envelope` fields as UI response
     fields after projection;
   - do not pull read/status/detail/SSE event payload validation into this
     action task.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/infrastructure/ui/routerActionDispatch.ts`
   - `src/v11/infrastructure/ui/routerActions.ts`
   - `src/v11/defaults/ui/routerDefaults.ts`
   - `src/v11/shared/ports/uiRouter.ts`
   - `src/contracts/ui/uiActions.ts`
   - `src/contracts/ui/deleteBubble.ts`
   - `tests/core/ui/router.test.ts`
2. Actual touched scope: fail-closed hardening for selected action response
   production at the backend UI router/dispatch seam.
3. Mutation entrypoints in scope:
   - `POST /api/bubbles/:bubbleId/delete`
   - `POST /api/bubbles/:bubbleId/commit`
   - `POST /api/bubbles/:bubbleId/merge`
   - same-dispatch siblings only if they share the same adapter shape exactly.
4. Hidden scope ruled out: browser API JSON parsing, read/detail/timeline
   routes, SSE event parsing, command execution internals, and UI component
   rendering remain outside this task.
5. Branch inventory note: valid selected action result, malformed selected
   action result, delete confirmation `202`, delete completed `200`, and
   existing command error mapping must be represented.
6. Why the declared task shape matches reality: the selected actions all pass
   through `dispatchBubbleAction` before `handleBubbleActionRequest` returns an
   HTTP action response, so the bounded validation seam can fail closed without
   changing command side effects or browser behavior.

### Authority Boundary Map

1. Authority producer: command/application flows produce runtime results;
   backend UI projectors/adapters produce browser-safe response DTOs.
2. Stored authority: canonical TypeScript UI contract source under
   `src/contracts/ui/**`; no persisted schema or database authority changes.
3. In-scope consumers: backend UI router/dispatch response path and its router
   tests for selected actions.
4. Explicit out-of-scope consumers: browser API response parsing, UI store
   interpretation, read/status/detail consumers, timeline/SSE event consumers,
   command contract corpus runners, and cleanup/recovery orchestration.
5. Export surfaces closed in this phase: no new public package boundary; any
   new validator export must remain inside the existing UI contract/runtime
   boundary and must not create a UI-local mirror.

### Baseline Preservation

1. Must-preserve behaviors:
   - commit still returns `bubbleId`, `sequence`, `event`, `actionState`,
     `commitSha`, `commitMessage`, and `stagedFiles`;
   - merge still returns cleanup/result booleans and branch/commit fields;
   - delete still returns `202` when confirmation is required and deletion has
     not happened, otherwise `200`;
   - command failures still flow through `mapActionErrorToApiError`;
   - successful UI responses do not expose command-internal `state` or
     `envelope`.
2. Allowed resolution paths:
   - existing `routerDefaults` projection functions may continue transforming
     command results to UI DTOs;
   - selected action dispatch handlers may call a shared validator/adapter
     before returning `{ status, result }`.
3. Forbidden regression interpretations:
   - do not change command execution success semantics to satisfy response
     validation;
   - do not make validation failure look like a successful action result;
   - do not collapse delete confirmation into delete success.
4. Replacement proof required if removed: any moved or replaced projection path
   must keep the same successful JSON response shape in `tests/core/ui/router.test.ts`
   and add an invalid-payload assertion for the selected action.

### Success / Completion Proof Boundary

1. Current canonical success proof source: selected action dependencies return a
   value and `dispatchBubbleAction` forwards it as `unknown` result.
2. Target canonical success proof source: selected action result passes runtime
   validation against the canonical UI-visible contract before the router
   returns a 2xx response.
3. Current canonical completion proof source: command/application flows own
   commit, merge, and delete side-effect completion.
4. Target canonical completion proof source: unchanged; this task validates
   response payload shape only.
5. Reused proof contract: current router action DTO projection tests and
   delete confirmation status tests.
6. Proof-parity rule: `inherit_full_parity`.
7. Final truth surfaces affected: HTTP action response `result` payloads and
   invalid-payload error responses for selected mutation actions.
8. Mixed-truth surfaces allowed: none; validation failure must not emit a
   partially trusted selected action result.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `fail_closed_hardening`.
2. Secondary shape (if any): `consumer_family_alignment`, limited to aligning
   the backend UI router response consumer with canonical UI contract shapes.
3. Preconditions that must pass before side effects: existing request-body and
   repo-scope validation remain before dispatch; response validation happens
   after command execution because it validates output shape, not mutation
   eligibility.
4. Side effects forbidden before preconditions pass: existing request
   preconditions must still block before command dispatch; this task must not
   move selected command execution earlier.
5. Invalid/precondition-failure behavior: invalid request input remains existing
   4xx behavior; invalid selected action response becomes a fail-closed router
   error and must not return 2xx.
6. Coordination primitives in scope: N/A; no new locks, leases,
   idempotency, or serialization.

### In Scope

1. Add or wire runtime validation for delete, commit, and merge UI action result
   payloads at one explicit backend UI router or dispatch seam.
2. Validate nested canonical action DTOs required by commit results, including
   `event` and `actionState`.
3. Validate delete confirmation and delete completion result shapes without
   changing the existing 202/200 status selection.
4. Validate merge result shape including branch, commit, presentation route, and
   cleanup booleans.
5. Include same-dispatch siblings only if they can call the same validation
   adapter shape without new fields, variants, or status semantics.
6. Add focused router tests for valid current shape preservation and invalid
   selected action response failure.

### Out of Scope

1. Read/status/detail/timeline response validation.
2. SSE or event-stream validation.
3. Browser API parser validation or UI store/display changes.
4. DTO ownership changes or UI-local schema mirrors.
5. Command execution semantics, cleanup/recovery behavior, retries,
   concurrency, locks, or git operation behavior.
6. Broad runtime schema coverage for every UI DTO.
7. Final import/fitness hardening owned by task `4-contract-drift-tests`.

### Safety Defaults

1. Fail closed on malformed selected action responses: no 2xx response and no
   partial result acceptance.
2. Preserve existing successful payloads exactly unless the canonical UI
   contract already requires a stricter shape.
3. Keep validators as guards over canonical contracts, not new contract
   authority.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - API/result shape: selected UI action HTTP response `result` payloads.
   - Structured payload validation: delete, commit, and merge result DTOs.
   - Error/fallback behavior: invalid selected action response fails closed
     instead of silently passing through `unknown`.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `4`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A.
10. Identity/join note:
    - canonical identity path: request route `bubbleId`/`repoPath` remains the
      action dispatch identity; response validation must not rematch identities.
    - competing identifiers or fallback identities: no secondary response
      identity source may override the selected action result payload.
11. Authority/source-of-truth note:
    - canonical source: `src/contracts/ui/**` for browser-safe shape and
      `src/v11/**` for runtime behavior.
    - forbidden secondary sources: UI-local barrels, UI client casts, command
      internals, and test fixtures as contract authority.
12. Closure-budget triage:
    - closure buckets touched: shared contract guard, action response producer,
      internal execution consumer at router seam.
    - intentionally collapsed closures: validator wiring and selected router
      response production, because they are the same dispatch seam.
    - explicitly deferred closures: read-model consumers, SSE/event consumers,
      browser parser consumers, broad fitness drift prevention.
13. Bounded-task-shape decision:
    - primary shape: `fail_closed_hardening`.
    - secondary shape: `consumer_family_alignment`.
    - why this bounded mix is safe: the same router action dispatch return path
      owns response emission and can validate selected results without changing
      command side effects or downstream UI interpretation.
14. Contract-dense decision:
    - gate triggered: `yes`.
    - trigger reasons: API/result shape, structured payload validation,
      fallback/error behavior, split ownership, downstream successor
      inheritance, mirrored surfaces.
    - canonical matrix source: `L1 0h Canonical Contract Matrix`.
    - mirrored surfaces: L0 goal/scope, domain contract, data contract,
      error/fallback contract, tests, and L2 acceptance checks.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Selected UI action response payloads must not silently drift through `unknown`. | Delete, commit, and merge success responses are validated before HTTP 2xx. | P1 | required-now |
| Control model | `src/contracts/ui/**` owns browser-safe shape; `src/v11/**` owns runtime behavior. | Validators guard conformance; they do not redefine contract or command behavior. | P1 | required-now |
| Read-path rule | Use canonical UI contract exports for UI-visible shapes. | Use `@pairflow/ui-contracts` where UI-visible contract consumption is needed and tooling supports it; otherwise import canonical backend contract source without UI-local mirrors. | P1 | required-now |
| Forbidden fallback | UI casts, local test fixtures, or command-internal fields are not fallback truth. | Missing required fields fail validation instead of being passed to the browser. | P1 | required-now |
| Allowed resolution path | Existing projection from command result to UI DTO may stay in `routerDefaults`. | Validate the projected selected result at the router/dispatch seam. | P1 | required-now |
| Missing-data rule | Missing required selected action fields fail closed. | Invalid selected action response returns a router error, not a partial success. | P1 | required-now |
| Phase boundary | 3a owns mutation/action validation only; 3b owns read/event validation. | Do not add read/detail/timeline/SSE validation in this task. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `UiCommitBubbleResult` | `src/contracts/ui/uiActions.ts` | Canonical UI commit response shape. | Preserve and validate. | P1 | required-now |
| `UiMergeBubbleResult` | `src/contracts/ui/uiActions.ts` | Canonical UI merge response shape. | Preserve and validate. | P1 | required-now |
| `UiDeleteBubbleResult` / `DeleteBubbleResult` | `src/contracts/ui/uiActions.ts`, `src/contracts/ui/deleteBubble.ts` | Canonical UI delete response shape; `UiDeleteBubbleResult` is the UI action alias for `DeleteBubbleResult`. | Preserve and validate the aliased canonical structure, including `DeleteBubbleArtifacts`. | P1 | required-now |
| `UiActionEvent` / `UiActionBubbleState` | `src/contracts/ui/uiActions.ts` | Nested canonical action DTOs for action-producing results. | Preserve and validate when present in selected result shape. | P1 | required-now |
| `state` / `envelope` command fields | `src/v11/defaults/ui/routerDefaults.ts`, `tests/core/ui/router.test.ts` | Command internals, not UI response fields after projection. | Keep absent from successful UI action responses. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | `routerActionDispatch.ts`, `routerActions.ts`, `routerDefaults.ts`, `uiRouter.ts`, selected contract files, router tests. | These files define the action response seam and proof surface. | P1 | required-now |
| Actual touched scope | Fail-closed hardening at selected action response boundary. | Do not change unrelated router resources or UI client parsing. | P1 | required-now |
| Mutation entrypoints in scope | Delete, commit, merge POST action paths. | Tests must hit the HTTP/router path or direct dispatch seam that returns action responses. | P1 | required-now |
| Hidden scope ruled out | Read/detail/timeline/SSE/browser parser surfaces are excluded. | Any validation there belongs to task `3b`. | P1 | required-now |
| Branch inventory note | Valid, invalid, delete confirmation, delete completed, command error mapping. | Test matrix must cover these branch families. | P1 | required-now |
| Shape proof | All selected actions share the backend UI action dispatch response seam. | Single task remains bounded. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Action result wire-shape drift can silently pass through `unknown` dispatch paths. | Add explicit validation for selected mutation action responses. | P1 | required-now |
| Depends on | `2b-ui-import-migration` archived. | Preserve stable contract entrypoint and boundary established by prior tasks. | P1 | required-now |
| Unlocks / impacts successors | `3b-read-event-validation`, `4-contract-drift-tests`. | Keep read/event semantics available for 3b and representative drift tests for 4. | P1 | required-now |
| Task-list impact | Creates `3a-action-response-validation`. | No supersession. | P1 | required-now |
| Inherited validation / exit expectation | Highest-risk action responses fail loudly on wire-shape drift. | Add valid and invalid selected action response tests. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `UiCommitBubbleResult` | backend UI router, `uiRouter.ts`, UI API/client types, router tests | additive | Add runtime validation for existing shape. | Broad drift fitness in task `4`. |
| `UiMergeBubbleResult` | backend UI router, `uiRouter.ts`, UI API/client types, router tests | additive | Add runtime validation for existing shape. | Read/event validation in task `3b`; broad drift fitness in task `4`. |
| `UiDeleteBubbleResult` / `DeleteBubbleResult` | backend UI router, `uiRouter.ts`, UI API/client types, delete contract tests, router tests | additive | Add runtime validation for the existing aliased shape and 202/200 status guard preservation. | Broad drift fitness in task `4`. |
| Same-dispatch sibling action result | backend UI router and UI API/client types | N/A until exact adapter shape is proven | Include only if the exact same validator adapter applies without extra semantics. | Otherwise document exclusion in implementation summary. |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Valid commit action response shape | preserve | Router test keeps exact JSON response shape and adds invalid field/missing-field failure. | P1 | required-now |
| Valid merge action response shape | preserve | Router test keeps exact JSON response shape and adds invalid field/missing-field failure. | P1 | required-now |
| Delete confirmation returns 202 when `requiresConfirmation=true` and `deleted=false` | preserve | Existing or new router test proves status and result shape. | P1 | required-now |
| Command error mapping through `mapActionErrorToApiError` | preserve | Existing error mapping tests remain green; validation errors get an explicit router failure expectation. | P1 | required-now |
| UI response excludes command internals | preserve | Tests continue asserting no `state` or `envelope` in successful selected results. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| Commit HTTP action result | dependency returns value; router forwards result | runtime validation passes for `UiCommitBubbleResult` | canonical result guarded by validator | no | P1 | required-now |
| Merge HTTP action result | dependency returns value; router forwards result | runtime validation passes for `UiMergeBubbleResult` | canonical result guarded by validator | no | P1 | required-now |
| Delete HTTP action result | dependency returns value; router derives 202/200 from result | runtime validation passes for `UiDeleteBubbleResult` / `DeleteBubbleResult` before status/result emission | canonical result guarded by validator | no | P1 | required-now |
| Command completion | command/application side effects | unchanged command/application side effects | out-of-scope canonical runtime truth | no | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| Invalid request body | Existing request parsers and repo-scope checks | Selected command dispatch | Existing 4xx/error behavior. | P1 | required-now |
| Valid request, invalid selected action result | HTTP 2xx response emission | Emitting partial successful UI result | Fail closed with router error; no successful result body. | P1 | required-now |
| Command execution failure | Existing command error mapping | Successful result validation path | Preserve `mapActionErrorToApiError` behavior. | P1 | required-now |

### 0h) Canonical Contract Matrix

Use this as the source of truth for dense contract behavior. Other sections may
summarize these rows but must not define conflicting behavior.

| ID | Condition / Input | Owner | Output / Status | Reason / Error Code | Retained / Dropped Data | Side Effects | Required Test |
|---|---|---|---|---|---|---|---|
| CCM1 | Valid commit action result matches `UiCommitBubbleResult`. | current task | HTTP 200 with unchanged `result`. | N/A | Retain all canonical fields; drop command internals if projection already excludes them. | Command side effects already occurred; no extra side effects. | T1 |
| CCM2 | Commit action result missing or malforms required canonical fields. | current task | Fail-closed router error, not 2xx. | HTTP `internal_error` with stable details `reasonCode: "UI_ACTION_RESPONSE_INVALID"` and selected action name. | Drop malformed result from success response. | No additional side effects beyond already-completed command attempt. | T2 |
| CCM3 | Valid merge action result matches `UiMergeBubbleResult`. | current task | HTTP 200 with unchanged `result`. | N/A | Retain canonical merge/cleanup fields. | Command side effects already occurred; no extra side effects. | T3 |
| CCM4 | Merge action result missing or malforms required canonical fields. | current task | Fail-closed router error, not 2xx. | HTTP `internal_error` with stable details `reasonCode: "UI_ACTION_RESPONSE_INVALID"` and selected action name. | Drop malformed result from success response. | No additional side effects beyond already-completed command attempt. | T4 |
| CCM5 | Valid delete result with `requiresConfirmation=true` and `deleted=false`. | current task | HTTP 202 with unchanged `result`. | N/A | Retain canonical delete fields. | Delete command side effects as currently defined. | T5 |
| CCM6 | Valid delete result in all other accepted selected delete cases. | current task | HTTP 200 with unchanged `result`. | N/A | Retain canonical delete fields. | Delete command side effects as currently defined. | T6 |
| CCM7 | Delete result missing or malforms required canonical fields used by status selection or result body. | current task | Fail-closed router error, not 2xx/202. | HTTP `internal_error` with stable details `reasonCode: "UI_ACTION_RESPONSE_INVALID"` and selected action name. | Drop malformed result from success response. | No additional side effects beyond already-completed command attempt. | T7 |
| CCM8 | Same-dispatch sibling result has exact same adapter shape as one selected action. | current task if proven | Same behavior as the matched selected adapter row. | Same as matched row. | Same as matched row. | Same as matched row. | T8 |
| CCM9 | Same-dispatch sibling requires different fields, variants, status, fallback, or nested validation semantics. | successor/deferred | Excluded from this task and documented. | N/A | N/A | N/A | T9 |
| CCM10 | Read/status/detail/timeline/SSE payload is encountered. | successor `3b` | No validation change in this task. | N/A | N/A | N/A | T10 |

### 0i) Ownership and Deferred Semantics

| Surface / Decision | Owned By This Task | Emits / Records Only | Deferred Owner | Forbidden Interpretation / Fallback | Priority | Timing |
|---|---|---|---|---|---|---|
| Selected action response validation | yes: delete, commit, merge | N/A | N/A | Do not delegate selected action validity to UI client casts. | P1 | required-now |
| Command side-effect completion | no | selected result is consumed after command attempt | existing command/application flows | Do not redefine command success/completion. | P1 | required-now |
| Browser response interpretation | no | validated result is emitted | UI client/store consumers | Do not add UI-local mirrors or browser fallback parsing. | P1 | required-now |
| Read/status/detail validation | no | N/A | task `3b-read-event-validation` | Do not include read payloads in same adapter unless they are action responses, which they are not. | P1 | required-now |
| SSE/event validation | no | N/A | task `3b-read-event-validation` | Do not conflate action event DTO nested inside commit with SSE event stream payload validation. | P1 | required-now |
| Drift/fitness hardening | no, except focused tests | validation evidence produced | task `4-contract-drift-tests` | Do not widen this task into final guardrail policy. | P2 | required-later |

### 0j) Structured Contract Rules

| Structured Contract | Required Fields | Optional Fields | Allowed Top-Level Fields / Variants | Unknown / Malformed / Duplicate Behavior | Retention / Drop Rule | Fallback Status / Reason | Priority | Timing |
|---|---|---|---|---|---|---|---|---|
| `UiCommitBubbleResult` | `bubbleId`, `sequence`, `event`, `actionState`, `commitSha`, `commitMessage`, `stagedFiles` | none unless already canonical | exactly canonical selected result fields; unknown top-level extras are rejected as validation failures | missing/wrong-type required fields fail validation; duplicate keys follow JSON parser behavior before validation | valid fields retained; invalid result not emitted as success | fail-closed router error with `reasonCode: "UI_ACTION_RESPONSE_INVALID"` and selected action name | P1 | required-now |
| `UiMergeBubbleResult` | `bubbleId`, `baseBranch`, `bubbleBranch`, `mergeCommitSha`, `presentationRoute`, `pushedBaseBranch`, `deletedRemoteBranch`, `tmuxSessionName`, `tmuxSessionExisted`, `runtimeSessionRemoved`, `removedWorktree`, `removedBubbleBranch` | none unless already canonical | exactly canonical selected result fields; `presentationRoute` must be `local` or `started_remote`; booleans remain booleans; unknown top-level extras are rejected | missing/wrong-type/unsupported literal/unknown top-level field fails validation | valid fields retained; invalid result not emitted as success | fail-closed router error with `reasonCode: "UI_ACTION_RESPONSE_INVALID"` and selected action name | P1 | required-now |
| `UiDeleteBubbleResult` / `DeleteBubbleResult` | `bubbleId`, `deleted`, `requiresConfirmation`, `artifacts`, `tmuxSessionTerminated`, `runtimeSessionRemoved`, `removedWorktree`, `removedBubbleBranch`; nested artifact groups require `exists` and path/name fields from `DeleteBubbleArtifacts` | `runtimeSession.sessionName` is `string | null` | exactly canonical aliased delete result object and nested artifact groups; unknown top-level and validator-owned nested artifact extras are rejected | missing/wrong-type/unknown top-level or validator-owned nested artifact field fails before status selection | valid fields retained; invalid result not emitted as success | fail-closed router error with `reasonCode: "UI_ACTION_RESPONSE_INVALID"` and selected action name | P1 | required-now |
| `UiActionEvent` nested in commit | `id`, `timestamp`, `bubbleId`, `sender`, `recipient`, `type`, `round`, `refs` | `summary`, `question`, `message`, `decision`, `passIntent`, `findingsClaimState`, `findingsClaimSource` | exactly canonical event fields; canonical participant/type/literal unions; unknown extras are rejected | missing/wrong-type required fields, unsupported literals, or unknown fields fail validation | valid nested event retained; invalid parent result not emitted | parent commit fails closed with `reasonCode: "UI_ACTION_RESPONSE_INVALID"` and selected action name | P1 | required-now |
| `UiActionBubbleState` nested in commit | `bubbleId`, `lifecycleState`, `round`, `activeAgent`, `activeRole`, `activeSince`, `lastCommandAt`, `executionContext` | N/A; nullable fields must accept only canonical null/value shape | exactly canonical action state fields; canonical lifecycle/agent/role and execution-context reference shape; unknown extras are rejected | missing/wrong-type required fields, unsupported literals, or unknown fields fail validation | valid nested state retained; invalid parent result not emitted | parent commit fails closed with `reasonCode: "UI_ACTION_RESPONSE_INVALID"` and selected action name | P1 | required-now |

### 0k) Mirrored Surface Checklist

| Canonical Matrix Row | Mirrored Surfaces | Required Alignment Rule | Summary-Only Surface? | Verification |
|---|---|---|---|---|
| CCM1-CCM2 | L0 goal/scope, L1 data contract, tests, L2 acceptance | Commit valid/invalid behavior must stay aligned with `UiCommitBubbleResult`. | L0 is summary-only. | T1, T2, L2 A1-A2 |
| CCM3-CCM4 | L0 goal/scope, L1 data contract, tests, L2 acceptance | Merge valid/invalid behavior must stay aligned with `UiMergeBubbleResult`. | L0 is summary-only. | T3, T4, L2 A3-A4 |
| CCM5-CCM7 | L0 baseline, L1 data/error contract, tests, L2 acceptance | Delete validation must precede status selection and preserve 202/200 behavior for valid shapes. | L0 is summary-only. | T5-T7, L2 A5-A7 |
| CCM8-CCM9 | L0 scope, L1 compatibility, implementation notes | Same-dispatch sibling inclusion requires exact adapter-shape proof. | yes | T8-T9, L2 A8 |
| CCM10 | L0 out-of-scope, L1 ownership/deferred semantics | Read/event validation remains deferred to 3b. | yes | T10, L2 A9 |

### 1) Call-Site Matrix

| Entrypoint / File | Current Role | Required Change | Priority | Timing |
|---|---|---|---|---|
| `src/v11/infrastructure/ui/routerActionDispatch.ts` | Dispatches action routes and returns `{ status, result: unknown }`. | Validate selected action results before returning success status/result. | P1 | required-now |
| `src/v11/infrastructure/ui/routerActions.ts` | Reads body, invokes dispatch, maps thrown errors. | Preserve error mapping and ensure validation failures route as router errors, not successful responses. | P1 | required-now |
| `src/v11/defaults/ui/routerDefaults.ts` | Projects command results to UI DTOs for commit and other actions; forwards merge/delete defaults. | Preserve projections; add validation only if this is the narrowest seam chosen by implementation. | P1 | required-now |
| `src/v11/shared/ports/uiRouter.ts` | Types UI router dependencies and selected action result ports. | Preserve existing port shape unless a validator helper import/export needs a typed boundary. | P2 | required-now |
| `src/contracts/ui/uiActions.ts` | Canonical selected UI action result contracts. | Preserve shape; export validator-adjacent types only if needed without redefining DTOs. | P1 | required-now |
| `src/contracts/ui/deleteBubble.ts` | Canonical delete artifacts/result structure. | Preserve shape and validate nested artifacts. | P1 | required-now |
| `tests/core/ui/router.test.ts` | Router-level action response proof. | Add valid preservation and invalid selected response failure tests. | P1 | required-now |
| `tests/contracts/uiContractTransitSource.test.ts` | Contract-source/transit proof. | Update only if validator/export wiring changes the contract transit surface. | P2 | conditional |

### 2) Data and Interface Contract

1. The selected response validators must accept the current canonical valid
   payloads for delete, commit, and merge.
2. Missing required top-level fields must fail validation for selected actions.
3. Wrong primitive types must fail validation for selected actions.
4. Unsupported literal values must fail validation for selected action nested or
   top-level unions.
5. Delete response validation must happen before deriving the HTTP status from
   `requiresConfirmation` and `deleted`.
6. Command-internal `state` and `envelope` fields must not become successful UI
   response fields.
7. Unknown top-level fields in selected action results must be rejected as
   validation failures. Unknown nested fields in selected canonical nested
   action DTOs must also be rejected where the validator owns that nested
   object.
8. Any helper public within backend code must have an explicit typed boundary;
   do not rely on call-site inference to define validation semantics.

### 3) Side Effects Contract

1. This task must not add command side effects.
2. Existing request validation and repo-scope checks must remain before command
   dispatch.
3. Response validation happens after the selected command/dependency returns
   because the task validates output payload shape, not action eligibility.
4. Validation failure must not trigger retry, cleanup, rollback, or follow-up
   mutation.
5. No new coordination primitives are allowed.

### 4) Error and Fallback Contract

1. Invalid selected action response payloads must fail closed and must not return
   HTTP 2xx/202.
2. Validation failures should use HTTP `internal_error` with a stable
   `details.reasonCode` of `UI_ACTION_RESPONSE_INVALID` and enough stable
   detail to identify the selected action family without depending on
   incidental stack traces.
3. Existing command/dependency failures must keep their current
   `mapActionErrorToApiError` behavior.
4. Browser client parsing/casting is not a fallback validation layer.
5. A same-dispatch sibling that cannot share the exact selected adapter must be
   documented as excluded, not accepted through a weaker generic validator.

### 5) Dependency Constraints

1. Preserve task `2b` entrypoint/boundary result: UI-visible contract
   consumption should use the established contract boundary and must not add new
   relative UI import exceptions.
2. Do not introduce a runtime dependency that makes browser bundles import
   Node-only backend code.
3. If a schema library is introduced, it must fit the existing repo toolchain
   without package-file changes unless the implementation bubble explicitly
   routes that package change through review. Prefer local validator functions
   if no library already exists.
4. Do not edit package files as part of this task unless ReviewTask or a later
   implementation bubble explicitly widens scope.

### 6) Test Matrix

| ID | Scenario | Expected Proof | Priority | Timing |
|---|---|---|---|---|
| T1 | Valid commit action response. | HTTP 200 and exact current `UiCommitBubbleResult` JSON shape. | P1 | required-now |
| T2 | Commit action response missing or malforming a required field. | Non-2xx fail-closed router error with `details.reasonCode: "UI_ACTION_RESPONSE_INVALID"` and selected action name. | P1 | required-now |
| T3 | Valid merge action response. | HTTP 200 and exact current `UiMergeBubbleResult` JSON shape. | P1 | required-now |
| T4 | Merge action response missing or malforming a required field. | Non-2xx fail-closed router error with `details.reasonCode: "UI_ACTION_RESPONSE_INVALID"` and selected action name. | P1 | required-now |
| T5 | Delete confirmation-required response. | HTTP 202 preserved when `requiresConfirmation=true` and `deleted=false`. | P1 | required-now |
| T6 | Delete completed/no-confirmation response. | HTTP 200 preserved for valid non-confirmation selected delete result. | P1 | required-now |
| T7 | Delete response malformed in a field needed for result/status. | Non-2xx fail-closed router error with `details.reasonCode: "UI_ACTION_RESPONSE_INVALID"`, selected action name, and no partial success body. | P1 | required-now |
| T8 | Same-dispatch sibling with exact selected adapter shape, if included. | Same valid/invalid tests as the matched adapter row. | P2 | conditional |
| T9 | Same-dispatch sibling excluded. | Implementation summary or test note states why exact adapter shape does not match. | P2 | conditional |
| T10 | Read/status/detail/SSE route unaffected. | Existing tests remain green; no new read/event validation tests in this task. | P1 | required-now |

## L2 - Acceptance Contract

### Acceptance Criteria

1. Delete, commit, and merge action responses are validated at a single explicit
   backend UI router or dispatch seam before a successful HTTP response is
   emitted.
2. Valid selected action responses preserve the current JSON payload shape and
   status behavior.
3. Invalid selected action response payloads fail closed with HTTP
   `internal_error`, stable `details.reasonCode` value
   `UI_ACTION_RESPONSE_INVALID`, and do not return 2xx/202.
4. Delete confirmation-required behavior still returns HTTP 202 only for a
   validated result where `requiresConfirmation=true` and `deleted=false`.
5. The task preserves the UI contract boundary: canonical UI contract shapes
   stay under `src/contracts/ui/**`, UI-visible contract consumption uses
   `@pairflow/ui-contracts` where needed, and no UI-local DTO/schema mirror is
   introduced.
6. Same-dispatch siblings are either validated through the exact same adapter
   shape or explicitly excluded with a reason.
7. Read/status/detail/timeline/SSE event validation is not implemented here and
   remains assigned to `3b-read-event-validation`.
8. Focused tests cover valid and invalid selected response paths, including at
   least one invalid response per selected action family.

### Verification Commands

1. Run `pnpm typecheck`.
2. Run `pnpm lint`.
3. Run `pnpm fitness:check:ci`.
4. Run the narrow affected router/contract tests, including
   `tests/core/ui/router.test.ts`.
5. Run `pnpm test`.
6. Run `pnpm build` because Pairflow CLI/runtime source changes under `src/**`
   are expected in the implementation bubble.

### ReviewTask Focus

1. Check that the selected validation seam is narrow and explicit.
2. Check that the canonical contract matrix is internally consistent with the
   L0 scope, L1 data/error rules, and L2 acceptance criteria.
3. Check that same-dispatch sibling inclusion cannot silently widen scope.
4. Check that task `3b` still owns read/status/detail/SSE event validation.
5. Check metadata consistency with
   `plans/ui-contract-boundary-hardening-plan-v1.md`.

### Open Blockers

None known from the loaded context.
