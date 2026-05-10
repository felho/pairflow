---
artifact_type: task
artifact_id: task_ui_action_api_smoke
task_family_id: ui-action-api-smoke
sequence_key: "4"
task_id: 4-ui-action-api-smoke
title: "UI Action API Smoke"
status: implementable
phase: phase1
system_context_ref: docs/architecture/almost-e2e-smoke-suite.md
target_files:
  - tests/almostE2e/
  - tests/almostE2e/uiActionApiSmoke.test.ts
  - tests/helpers/almostE2eSmoke/
  - tests/helpers/almostE2eSmoke/index.ts
target_files_role: write_targets_with_read_only_anchors
target_write_files:
  - tests/almostE2e/
  - tests/almostE2e/uiActionApiSmoke.test.ts
  - tests/helpers/almostE2eSmoke/
  - tests/helpers/almostE2eSmoke/index.ts
target_read_only_anchors:
  - docs/architecture/almost-e2e-smoke-suite.md
  - plans/almost-e2e-smoke-suite-plan-v1.md
  - plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/1-smoke-runner-contract.md
  - plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/2-cli-lifecycle-smoke.md
  - plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/3-actor-loop-smoke.md
  - src/v11/infrastructure/ui/router.ts
  - src/v11/infrastructure/ui/routerActions.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/defaults/ui/routerDefaults.ts
  - src/v11/application/open/openBubble.ts
  - src/v11/application/restart/restartCommandApi.ts
  - src/v11/application/delete/deleteBubble.ts
  - tests/core/ui/router.test.ts
  - tests/almostE2e/cliLifecycleSmoke.test.ts
  - tests/almostE2e/actorLoopSmoke.test.ts
prd_ref: null
plan_ref: plans/almost-e2e-smoke-suite-plan-v1.md
doc_bubble_id: 4-ui-action-api-smoke-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-09-almost-e2e-smoke-suite-plan-v1
owners:
  - "testing/runtime"
---

# Task: UI Action API Smoke

## L0 - Policy

### Goal

Add an in-process UI action API smoke that drives Open, Restart, and Delete
through the same UI router/action dispatch layer used by the app, backed by
real Pairflow fixture state and fake external side-effect adapters. The smoke
must prove that UI action dispatch reaches the backend command paths for the
target actions without requiring a browser, real HTTP transport outside the
in-process route layer, real editor launch, real tmux interaction, or a real
LLM.

### Domain / Control Model Summary

1. Business invariant: the Phase 1 smoke suite must catch regressions where UI
   action buttons or API clients still serialize a request, but the backend
   action route no longer dispatches to the intended Open, Restart, or Delete
   command behavior.
2. Control model: UI route parsing, action dispatch, backend command
   dependencies, status/read-model projection, lifecycle persistence, and
   action DTO validation remain production-owned.
3. Read-path rule: the smoke must observe lifecycle and action results through
   the UI route/action API response shape and public Pairflow status/read-model
   surfaces, not by directly mutating or trusting private state files.
4. Forbidden fallback: the test must not call Open, Restart, or Delete
   application functions directly as a substitute for the UI action route under
   test. It must not write bubble state, transcript, registry, runtime session,
   or side-effect logs directly to fake a successful action.
5. Allowed resolution path: fixture-local configuration, the existing
   almost-e2e smoke fixture, in-process `createUiRouter` request handling, and
   fake editor/tmux/process adapters may be extended when the request still
   enters through the UI route/action layer and external effects are recorded at
   existing adapter boundaries.
6. Missing-data rule: if the UI action response, refreshed status/read-model,
   or fake side-effect record cannot prove that a target action reached the
   backend command path, the smoke must fail the step instead of inferring
   success from a lack of thrown errors.
7. Source-change guard: if the current route/action API cannot exercise Open,
   Restart, and Delete through existing public wiring and test-helper
   boundaries, this task must return for plan/task refinement instead of adding
   production hooks, changing command semantics, or broadening runtime contracts.

### In Scope

1. Add one focused almost-e2e smoke for UI action API dispatch of Open,
   Restart, and Delete.
2. Use an isolated fixture repo and real Pairflow bubble state created through
   the existing smoke fixture conventions.
3. Invoke actions through the in-process UI route/action layer with request
   shapes equivalent to UI/client calls:
   `/api/bubbles/<id>/open?repo=<repo>`,
   `/api/bubbles/<id>/restart?repo=<repo>`, and
   `/api/bubbles/<id>/delete?repo=<repo>`.
4. Assert that Open reaches the backend open command and records the configured
   fake editor/open side effect.
5. Assert that Restart reaches the backend restart command, preserves the
   bubble identity and worktree path, refreshes public status to a running
   lifecycle state, and records bounded fake tmux/runtime side effects.
6. Assert that Delete reaches the backend delete command, removes the fixture
   bubble artifacts/worktree when forced, returns the expected action DTO, and
   records bounded fake cleanup side effects.
7. Keep the smoke in-process for Phase 1: no browser, Playwright, real HTTP
   server requirement, or UI rendering assertions.

### Out of Scope

1. Browser rendering, Playwright, and real HTTP transport coverage.
2. UI component click behavior or visual action availability.
3. Actor-loop feedback ingestion, already owned by `3-actor-loop-smoke`.
4. Human approval, commit/merge closure, multi-round review loops, and Layer 3
   golden full-ish smoke.
5. Changing production UI action semantics, command option contracts, or delete
   confirmation behavior to make the smoke easier to write.
6. Adding source-level test hooks unless the task first returns to refinement
   with exact target files and preservation tests for default behavior.

## L1 - Change Contract

### Canonical Contract Matrix

| Contract Row | Canonical Rule | Producer / Storage | Runtime Behavior | Failure / Reason Code | Required Proof |
|---|---|---|---|---|---|
| UI action entrypoint | Target actions must enter through the UI router/action request path, not direct application calls or action-dispatch shortcuts that skip request parsing. | In-process route invocation using production `createUiRouter`/action dispatch. | Router resolves repo, parses action/body, dispatches to backend dependencies, maps/validates DTO output. | Fail when the test bypasses the route/action layer, skips route request parsing, or uses a private command helper as the asserted action path. | Test records request URL/method/body and validates response status/body for Open, Restart, and Delete. |
| Open action | Open must call the backend open command through router dispatch and record the fake editor/open side effect. | UI action response plus fake external-adapter side-effect log. | Response exposes `UiOpenBubbleResult` without raw internal carrier fields. | Fail when open returns success without a matching fake open side effect or when raw internal fields leak into the DTO. | Assertions cover action response and side-effect record after the Open request. |
| Restart action | Restart must call backend restart through router dispatch and preserve the fixture bubble identity/worktree while refreshing lifecycle status. | Pairflow state/runtime artifacts plus fake tmux/process side effects. | Response exposes `UiRestartBubbleResult`; public status/read-model shows the restarted bubble still running. | Fail when restart only updates a mock response, loses bubble/worktree identity, or cannot prove running status after restart. | Assertions cover action response, refreshed status/read-model, and bounded fake side effects. |
| Delete action | Forced delete must call backend delete through router dispatch and remove the fixture bubble artifacts/worktree. | Pairflow artifact cleanup plus fake tmux/runtime cleanup side effects. | Response exposes `UiDeleteBubbleResult` and the fixture bubble is absent afterward. | Fail when delete returns success but artifacts/worktree remain, when confirmation semantics are bypassed incorrectly, or when cleanup effects are unbounded. | Assertions cover forced request body, action response, absence of artifacts/worktree, and bounded fake cleanup records. |
| Phase 1 scope | The task ships in-process UI action API smoke only. | `tests/almostE2e/uiActionApiSmoke.test.ts` and narrow helper extensions. | Browser, rendering, real HTTP server, and Layer 3 remain deferred. | Review failure if this task claims browser/HTTP/Playwright coverage or expands into full lifecycle close. | Test names, assertions, and docs stay limited to in-process action API dispatch. |

### Ownership and Deferred Semantics

1. This task owns the first almost-e2e smoke for UI action API dispatch of
   Open, Restart, and Delete.
2. It consumes fixture setup and fake external-adapter conventions from the
   earlier smoke tasks but does not redefine actor-loop or compiled CLI
   coverage.
3. It may extend test/helper exports only when the new surface is needed to
   invoke the UI route/action layer against an isolated fixture repo and real
   backend state, and the extension does not change production route semantics
   or create source-level test hooks.
4. It does not own browser rendering, action button availability, full HTTP
   transport, human approval, commit/merge closure, or Layer 3 coverage.
5. Positive smoke evidence must be trusted only after a fresh `pnpm build` when
   the scenario depends on compiled runtime artifacts or generated router
   contracts.

### Capability Closure

| Capability Claim | Closure Classification | Activation / Entrypoint | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| Maintainers can run a Phase 1 UI action API smoke proving Open, Restart, and Delete route/action dispatch against real backend state with fake external effects. | end_to_end | Root Vitest execution of `tests/almostE2e/uiActionApiSmoke.test.ts` invoking the in-process UI route/action layer. | Fixture repo, fake external adapters, UI router/action request path, backend command dependencies, and assertions for refreshed state/effects. | Node/pnpm environment and fresh build when compiled or generated runtime artifacts are used. | Passing focused UI action API smoke plus relevant helper/router validation evidence. |
| Phase 1 almost-e2e smoke suite final proof can include UI action dispatch after CLI and actor-loop smoke tasks are already archived. | foundation_only | Parent plan validation after this task closes. | This task supplies the remaining UI action gap only. | Final parent-plan closure still verifies all Phase 1 tasks and documentation together. | This task does not claim Layer 3, browser, real HTTP, or full close lifecycle coverage. |

### Authority Boundary Map

| Boundary Bucket | In Scope For This Task | Explicit Rule |
|---|---|---|
| UI action route | Yes. | The test must enter through `createUiRouter`/route request handling or an equivalent in-process route/action invocation that preserves request parsing, repo resolution, action dispatch, and DTO mapping. |
| Backend command paths | Yes, as observed behavior. | Open, Restart, and Delete remain production-owned; the smoke observes their results and side effects. |
| Public status/read model | Yes. | Restart and Delete assertions must use public status/read-model or fixture-visible production artifacts after actions. |
| Fake external side effects | Yes. | Editor, tmux/runtime, and cleanup effects may be faked only at existing adapter boundaries and must be asserted explicitly. |
| UI components | No. | Button rendering, action availability, and browser click behavior stay out of scope. |
| Real HTTP transport | No. | Phase 1 uses in-process action invocation; HTTP server/socket coverage is deferred. |
| Full close lifecycle | Deferred. | Approve/commit/merge and human approval flows remain outside this task. |

### Baseline Preservation

| Must Preserve | Allowed Resolution Path | Forbidden Regression Interpretation | Replacement Proof Required If Removed |
|---|---|---|---|
| UI action dispatch owns the backend action path for Open, Restart, and Delete. | Invoke the production route/action layer and assert backend effects. | Treating mocked client serialization or direct command calls as UI action API coverage. | Plan/task refinement naming a different UI action entrypoint and updating successor coverage. |
| External slow effects stay fake in Phase 1. | Use fake editor/tmux/process cleanup records from existing smoke boundaries. | Launching a real editor, terminal, browser, or tmux session in the smoke. | Plan refinement moving this coverage to a later Layer 3 or manual smoke. |
| Browser and real HTTP coverage are deferred. | Keep test in-process and route/action focused. | Claiming UI rendering or transport coverage from in-process request assertions. | Separate plan/task refinement for browser or HTTP transport smoke. |

## L2 - Implementation Plan

1. Inspect the existing almost-e2e fixture helpers, UI router/action dispatch
   tests, and Open/Restart/Delete backend command contracts.
2. Add only the narrow test/helper surface needed to construct an in-process UI
   router/action request against an isolated fixture repo with fake external
   adapters. The helper must preserve route parsing, repo resolution, action
   dispatch, and DTO mapping as part of the exercised path.
3. Add `tests/almostE2e/uiActionApiSmoke.test.ts` that creates or starts a
   minimal fixture bubble through existing smoke conventions, then invokes:
   - Open through the UI route/action API and asserts the action DTO plus fake
     editor/open side-effect record.
   - Restart through the UI route/action API and asserts action DTO,
     refreshed public status/read-model state, preserved identity/worktree, and
     bounded fake tmux/runtime side effects.
   - Forced Delete through the UI route/action API and asserts action DTO,
     artifact/worktree absence, and bounded fake cleanup side effects.
4. Assert that no real browser, editor, terminal, or real tmux interaction is
   launched.
5. Keep the test name, assertions, and helper exports limited to UI action API
   dispatch; do not add browser, Playwright, real HTTP, human approval, or
   commit/merge coverage.

### Validation Requirements

1. Run `pnpm build` before trusting positive UI action API smoke evidence when
   compiled or generated runtime artifacts are involved.
2. Run the focused UI action API smoke test.
3. Run relevant almost-e2e helper and UI router/action tests touched by this
   task.
4. Run `pnpm typecheck`, `pnpm lint`, and `pnpm fitness:check:ci`.
5. Run `pnpm test` before declaring the implementation complete.
6. If any validation step is skipped or fails, record the exact command and the
   reason in the bubble handoff.

### Review / Route-Back Conditions

Return for task or plan refinement instead of adding opportunistic production
hooks when:

1. the current UI route/action layer cannot invoke Open, Restart, or Delete
   without direct application calls;
2. fake external-adapter injection cannot be done through existing boundaries
   while preserving the production route/action path;
3. preserving real backend state would require modifying `src/**`, UI route
   semantics, command defaults, runtime/build configuration, or lifecycle
   persistence outside the current task target files;
4. delete cleanup proof cannot be observed through action response plus
   fixture-visible production artifacts;
5. the work would naturally expand into browser rendering, real HTTP
   transport, Playwright, human approval, commit/merge closure, or Layer 3
   coverage.
