---
artifact_type: plan
artifact_id: plan_ui_contract_boundary_hardening_v1
plan_id: ui-contract-boundary-hardening-plan-v1
created_on: "2026-05-04"
title: "UI Contract Boundary Hardening Plan"
status: approved
plan_status: in_progress
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-ui-contract-guard-cleanup
  - 2a-contract-entrypoint
  - 2b-ui-import-migration
  - 3a-action-response-validation
  - 3b-read-event-validation
  - 4-contract-drift-tests
active_task_id: 2a-contract-entrypoint
archive_group: 2026-05-04-ui-contract-boundary-hardening-plan-v1
task_tracker:
  - task_id: 1-ui-contract-guard-cleanup
    task_path: plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/1-ui-contract-guard-cleanup.md
    status: archived
  - task_id: 2a-contract-entrypoint
    task_path: plans/tasks/2a-contract-entrypoint.md
    status: approved
  - task_id: 2b-ui-import-migration
    task_path: null
    status: not_created
  - task_id: 3a-action-response-validation
    task_path: null
    status: not_created
  - task_id: 3b-read-event-validation
    task_path: null
    status: not_created
  - task_id: 4-contract-drift-tests
    task_path: null
    status: not_created
---

# Plan: UI Contract Boundary Hardening

## Objective

Close the remaining hardening gaps after the completed
`2026-05-02-ui-contract-boundary-plan-v1` migration: stale guardrail exceptions,
fragile UI-to-backend relative contract imports, the remaining shared-kernel
protocol type import, and weak runtime validation at the UI HTTP/JSON seam.

This plan does not repeat the archived foundation/core/read-model migration.
It turns the residual modularity-review item 4 follow-up work into bounded
implementation tasks.

## Merge Readiness

This plan is suitable to merge as a planning artifact when it remains
documentation-only and preserves the closed UI contract ownership model. It does
not authorize product/source changes by itself; implementation must happen
through the task sequence below after each task artifact is created and reviewed.

## Done Definition

1. `ui_contract_boundary` has no stale or unused exceptions, and the policy
   state matches the actual import graph.
2. UI contract consumers use one intentional public entrypoint for backend-owned
   UI contracts instead of scattered `../../../src/...` imports.
3. UI-visible protocol type needs are exported through `src/contracts/ui/**`
   rather than direct `src/types/**` imports from the browser package.
4. The highest-risk UI action/read response payloads have runtime validation at
   the backend router seam or a deliberately documented validation boundary.
5. Contract drift prevention covers forbidden direct imports, entrypoint use,
   and at least one runtime validation failure path.

## Non-Goals

1. Do not introduce a standalone package boundary in this plan slice; if task
   2a proves the in-repo alias path cannot satisfy root and UI tooling, report
   the resolver blocker instead of widening scope.
2. Do not reopen DTO ownership or duplicate contract shapes in `ui/src/**`.
3. Do not add broad runtime schemas for every UI DTO in this plan; validation
   starts with the named highest-risk action/read/event seams.
4. Do not move runtime/application ownership out of `src/v11/**`; only expose
   browser-safe views through `src/contracts/ui/**`.

## Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| Browser and backend share UI contracts through a single intentional contract boundary. | foundation_only | TypeScript imports under `ui/src/**` and backend router/UI contract imports. | `src/contracts/ui/**`, UI import entrypoint, fitness/tests. | None. | Planned in tasks 1, 2a, 2b, and 4. |
| UI HTTP/action responses fail loudly on selected wire-shape drift. | end_to_end | Backend UI router action/status/detail response construction for the selected action, read, and event seams. | Runtime validators or explicit validation adapters for selected DTOs, plus representative failure-path tests. | None. | Planned in tasks 3a, 3b, and 4. |

## Guiding Principles

1. Business invariant: UI-visible payload shape must be owned once by the
   backend UI contract surface and consumed consistently by backend router code
   and browser code.
2. Control model: `src/contracts/ui/**` remains canonical authority for
   browser-safe UI DTOs; `src/v11/**` remains runtime/application/internal
   ownership; UI-local barrels may re-export canonical contracts but must not
   redeclare backend contract shape.
3. Read-path rule: UI shared contracts may be read from the intentional contract
   entrypoint only. Backend internals may use implementation-local runtime
   types, but browser code must not import `src/v11/**` or general backend
   shared-kernel types directly.
4. Forbidden fallback: no comment-driven "keep in sync" mirrors, no direct
   `src/v11/**` UI imports, and no direct `src/types/**` UI imports for
   browser-visible protocol/read-model contracts.
5. Allowed resolution path: when a UI-visible field or literal changes, update
   the canonical `src/contracts/ui/**` export first, then migrate backend/UI
   consumers to that export.
6. Missing-data rule: unknown or absent wire data must fail validation for
   required contract fields; optional runtime data must be represented as
   explicit optional or `null` contract shape rather than a UI-local heuristic.
7. Sequencing / boundary note:
   - producer-first rule: contract entrypoint creation must happen before the
     import migration, and both must happen before import guard tightening that
     would reject the current UI relative imports.
   - downstream consume families that remain separate: backend router
     production, browser API consumption, UI event handling, and fitness/tests.
   - cleanup/recovery timing: included now for stale policy exceptions;
     standalone package boundary extraction remains out of scope for this plan
     slice.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/architecture/ui-contract-governance.md`
   - `plans/archive/plans/2026-05-02-ui-contract-boundary-plan-v1.md`
   - `src/contracts/ui/**`
   - `tools/fitness/checks/ui-contract-boundary.ts`
   - `tools/fitness/policy.json`
   - `tests/contracts/uiContractParity.types.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
2. Closed canonical elements / terms:
   - `src/contracts/ui/**` is the canonical browser-safe UI contract surface.
   - `ui/src/lib/types.ts` may be a convenience barrel only when it imports or
     re-exports canonical contracts without redefining them.
   - `src/types/bubble.ts` remains lifecycle runtime literal authority, with
     `src/contracts/ui/bubbleLifecycle.ts` re-exporting the browser-safe view.
3. Explicitly authorized reinterpretation: none. This plan hardens the closed
   contract; it does not reopen the ownership model completed by the archived
   2026-05-02 plan.
4. Downstream task impact: every task must preserve the existing canonical
   contract authority and may only add narrower entrypoints, validators, or
   guardrails.

## Current Status

### Completed Work

1. The archived UI contract boundary plan created `src/contracts/ui/**`.
2. Delete-bubble, lifecycle, state-validation, remote-execution, action,
   read-model, event, and error DTO mirrors were moved behind the canonical
   contract surface.
3. The UI no longer imports `src/v11/shared/metaReviewGate/**` directly.
4. `ui_contract_boundary` and `ui_router_port_boundary` pass in
   `pnpm fitness:check:ci`.

### Open Work

1. `tools/fitness/policy.json` still contains a stale
   `ui-contract-boundary-known-meta-review-drift-001` exception that is no
   longer applied.
2. UI contract files still use many relative imports such as
   `../../../src/contracts/ui/...`, which makes the boundary harder to audit
   and easy to copy incorrectly.
3. `ui/src/lib/types.ts` still imports `ProtocolMessageType` directly from
   `src/types/protocol.js` instead of a UI contract export.
4. Backend router/UI API paths still move many responses as `unknown` after JSON
   parsing or action dispatch, with limited explicit runtime response
   validation at the contract seam.

### Deferred / Future Work

1. A standalone package boundary remains future work for external consumers or
   a later dedicated extraction task, not a fallback inside task `2a`.
2. Full schema coverage for every UI DTO is deferred; this plan starts with the
   highest-risk action/status/detail/event seams.

## Progress / Phase Summary

1. Phase 1: clean stale guardrails and close the obvious protocol import leak.
2. Phase 2a: introduce one intentional UI contract entrypoint or alias with
   minimal proof.
3. Phase 2b: migrate UI imports to the new entrypoint.
4. Phase 3a: add runtime validation for selected mutation/action responses.
5. Phase 3b: add runtime validation for selected read/event responses.
6. Phase 4: harden drift tests and fitness coverage so the boundary stays
   closed.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-ui-contract-guard-cleanup` | `plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/1-ui-contract-guard-cleanup.md` | Remove stale `ui_contract_boundary` exception, move UI-visible `ProtocolMessageType` behind `src/contracts/ui/**`, and update the narrow affected imports/tests. | N/A | Stale policy exception and direct `src/types/protocol.js` UI import. | archived |
| `2a-contract-entrypoint` | `plans/tasks/2a-contract-entrypoint.md` | Implement `@pairflow/ui-contracts` as the smallest intentional in-repo UI contract entrypoint, with enough TS/Vite proof that both root and UI tooling can resolve it. A standalone package boundary remains rejected for this slice; resolver failure must be reported as a blocker. | `1-ui-contract-guard-cleanup` | Unclear public entrypoint and config-level uncertainty. | approved |
| `2b-ui-import-migration` | `null` | Mechanically migrate UI contract imports away from scattered relative `../../../src/...` paths to the entrypoint from `2a`, without changing contract shapes. | `2a-contract-entrypoint` | Fragile high-distance relative imports. | not_created |
| `3a-action-response-validation` | `null` | Add runtime validation for selected mutation/action result payloads, starting with delete, commit, and merge, plus same-dispatch siblings only if they share the exact validation adapter shape. | `2b-ui-import-migration` | Action result wire-shape drift can still silently pass through `unknown` dispatch paths. | not_created |
| `3b-read-event-validation` | `null` | Add runtime validation for selected read/status/detail and SSE event payloads, separately from mutation actions because read models and event streams have different failure semantics. | `3a-action-response-validation` | Read/event wire-shape drift can still silently pass through JSON/event paths. | not_created |
| `4-contract-drift-tests` | `null` | Extend tests/fitness to enforce the new entrypoint rule, protocol export rule, stale-exception cleanup, and representative runtime validation failures for action and read/event seams. | `3b-read-event-validation` | Drift prevention is incomplete after hardening changes. | not_created |

## Task Acceptance Contracts

1. `1-ui-contract-guard-cleanup`
   - Removes only stale or unused `ui_contract_boundary` policy state.
   - Exposes the UI-visible `ProtocolMessageType` need through
     `src/contracts/ui/**`.
   - Leaves runtime/lifecycle authority in `src/types/bubble.ts` and
     `src/types/protocol.js`; browser code consumes only the UI contract view.
2. `2a-contract-entrypoint`
   - Records the `@pairflow/ui-contracts` entrypoint shape and records the
     standalone package boundary alternative as rejected for this slice.
   - Proves resolution in both root TypeScript tooling and the UI build/test
     path before broader import migration begins.
3. `2b-ui-import-migration`
   - Performs an import-only migration to the task 2a entrypoint.
   - Does not change DTO fields, literals, validation semantics, or router/API
     behavior.
4. `3a-action-response-validation`
   - Validates delete, commit, and merge action result payloads at one explicit
     backend router or dispatch seam.
   - Documents any intentionally excluded same-dispatch siblings and why they
     do not share the exact adapter shape.
5. `3b-read-event-validation`
   - Keeps read/status/detail validation behavior separate from SSE/event stream
     validation behavior.
   - Defines how invalid required data fails and how optional/null data remains
     accepted.
6. `4-contract-drift-tests`
   - Adds regression coverage for the final import rule, the protocol export
     rule, stale policy exception removal, and representative validation
     failures.
   - Fails on direct browser imports from forbidden backend internals.

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| Stale policy exception remains after migration. | `1-ui-contract-guard-cleanup` | The exception is currently configured but not applied. |
| Browser code imports shared-kernel protocol type directly. | `1-ui-contract-guard-cleanup` | Export the UI-visible protocol type from `src/contracts/ui/**`. |
| UI contract entrypoint is not explicit enough. | `2a-contract-entrypoint` | Implement `@pairflow/ui-contracts` as the smallest entrypoint that works with current root/UI TS configs; keep standalone package boundary extraction out of scope for this slice. |
| UI imports canonical contracts through brittle relative paths. | `2b-ui-import-migration` | Mechanical migration only; no DTO shape changes. |
| Mutation/action responses lack explicit validation at key seams. | `3a-action-response-validation` | Start with delete, commit, and merge action result payloads. |
| Read/status/detail/event responses lack explicit validation at key seams. | `3b-read-event-validation` | Keep read/event failure semantics separate from action validation. |
| Boundary can regress after cleanup. | `4-contract-drift-tests` | Tests should fail on direct UI imports from forbidden backend internals and stale exception reintroduction. |

## Dependencies and Order

1. `1-ui-contract-guard-cleanup` runs first because it removes known stale state
   and closes the smallest remaining direct backend type import.
2. `2a-contract-entrypoint` runs before the import sweep so the task can focus
   on config and entrypoint proof without also owning a broad mechanical edit.
3. `2b-ui-import-migration` runs after the entrypoint is proven and must avoid
   DTO shape changes.
4. `3a-action-response-validation` runs after imports settle so validators and
   action consumers use the stable contract entrypoint.
5. `3b-read-event-validation` follows action validation but stays separate
   because read/status/detail and SSE event streams have different failure and
   fallback behavior.
6. `4-contract-drift-tests` runs last because it should encode the final
   boundary shape, not the transitional import paths.

## Risks and Assumptions

1. Assumption: the current UI package remains private and in-repo, so a TS path
   alias or internal entrypoint is the smallest current boundary; standalone
   package boundary extraction remains future work.
2. Risk: Vite/TypeScript config changes for aliases can create build drift
   between root and UI packages; task 2a must verify both root and UI builds
   before task 2b performs the broader import migration.
3. Risk: overly broad runtime schemas can turn normal optional runtime data into
   false failures; tasks 3a and 3b must distinguish required contract fields
   from optional/null fields.
4. Risk: adding validators without guard tests would create another
   convention-only seam; task 4 must make the hardening durable.
5. Risk: an import alias that works in one toolchain but not another can create
   a hidden split between development and CI; task 2a must treat mismatched
   root/UI resolution as a blocker rather than deferring it to task 2b.

## Validation Strategy

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. Targeted contract tests:
   - `pnpm exec vitest run tests/contracts/uiContractParity.types.ts tests/contracts/uiContractTransitSource.test.ts`
   - new or updated UI contract boundary/validation tests from tasks 1, 3a,
     3b, and 4
5. Targeted fitness tests for `ui_contract_boundary` and any new entrypoint rule.
6. `pnpm --dir ui test`
7. `pnpm test`
8. `pnpm build`
9. `pnpm --dir ui build` if task 2 or UI contract import changes affect the UI
   build path.
