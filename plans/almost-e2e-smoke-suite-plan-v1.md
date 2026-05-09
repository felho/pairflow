---
artifact_type: plan
artifact_id: plan_almost_e2e_smoke_suite_v1
plan_id: almost-e2e-smoke-suite-plan-v1
created_on: "2026-05-09"
title: "Almost-End-to-End Smoke Suite Plan"
status: approved
plan_status: approved
prd_ref: null
owners:
  - "testing/runtime"
task_order:
  - 1-smoke-runner-contract
  - 2-cli-lifecycle-smoke
  - 3-actor-loop-smoke
  - 4-ui-action-api-smoke
active_task_id: 2-cli-lifecycle-smoke
last_completed_task_id: 1-smoke-runner-contract
archive_group: 2026-05-09-almost-e2e-smoke-suite-plan-v1
task_tracker:
  - task_id: 1-smoke-runner-contract
    task_path: plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/1-smoke-runner-contract.md
    status: archived
    notes: "Build the fake launch, fake external-adapter, scenario, and authority-refresh runner contract."
  - task_id: 2-cli-lifecycle-smoke
    task_path: plans/tasks/2-cli-lifecycle-smoke.md
    status: in_progress
    notes: "Add compiled-CLI lifecycle smoke coverage for create/start, restart, open, and delete."
  - task_id: 3-actor-loop-smoke
    task_path: null
    status: not_created
    notes: "Add one runner-driven fake actor loop through pass, convergence, and meta-review approve."
  - task_id: 4-ui-action-api-smoke
    task_path: null
    status: not_created
    notes: "Add in-process UI action API smoke coverage for Open, Restart, and Delete."
---

# Plan: Almost-End-to-End Smoke Suite

## Objective

Deliver the first stable almost-end-to-end smoke layer for Pairflow public
entrypoints. The suite must catch wiring bugs around compiled CLI dispatch,
dependency defaults, lifecycle state/transcript routing, and UI action API
dispatch without launching real LLMs, real tmux terminals, real editors, or a
real browser.

The source architecture document is
`docs/architecture/almost-e2e-smoke-suite.md`.

## Done Definition

1. A reusable fake launch + runner contract exists and can drive scripted actor
   responses through the canonical `pairflow agent emit --kind ...` surface.
2. Phase 1 CLI smoke runs against the compiled `dist/cli/index.js` entrypoint
   and covers create/start, restart, open, and delete on a fixture repo.
3. Phase 1 actor-loop smoke proves one minimal happy path through pass,
   convergence, and meta-review approval using the fake runner.
4. Phase 1 UI action API smoke invokes Open, Restart, and Delete through the
   in-process route/action layer with real backend state and recorded external
   side effects.
5. The suite is fast and deterministic enough for regular PR use, with Layer 3
   golden full-ish smoke explicitly deferred until Phase 1 runtime and stability
   are known.
6. The suite documentation and validation notes make clear which surfaces are
   real, which adapters are faked, and which bug classes remain out of scope.

## Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| Phase 1 almost-e2e smoke suite can be run by maintainers/CI to catch public-entrypoint wiring regressions. | end_to_end | A repository test command that runs the smoke suite against built CLI artifacts and fixture repos. | Smoke runner, fake adapters, scenario definitions, fixture repo setup, and tests. | Node/pnpm test environment and a current build artifact for compiled CLI smoke. | Planned across `1-smoke-runner-contract`, `2-cli-lifecycle-smoke`, `3-actor-loop-smoke`, and `4-ui-action-api-smoke`; final proof belongs to the last Phase 1 smoke task. |
| Layer 3 golden full-ish bubble smoke. | deferred_activation | Future post-merge/pre-release smoke command after Phase 1 stabilizes. | Not shipped by this plan's Phase 1 tasks. | Runtime budget and cadence decision after Phase 1 data exists. | Deferred; no Phase 1 done wording may imply Layer 3 is complete. |

## Guiding Principles

1. Business invariant: the suite must catch public-entrypoint wiring rot without
   turning prompt quality, browser rendering, editor launch, or terminal
   lifecycle into PR-blocking runtime dependencies.
2. Control model: production Pairflow command dispatch, route/action dispatch,
   state/transcript/inbox/registry persistence, envelope validation, and
   sequence allocation remain canonical. The smoke harness may replace only
   slow external side-effect adapters at existing port boundaries.
3. Read-path rule: runner lifecycle state and post-first actor authority must be
   read from the public status/read-model surfaces used by CLI/UI, not from
   private state-file shortcuts. The first fake actor advance may use captured
   launch handoff/execution authority only after validating it against that same
   public status/read-model surface immediately before emit.
4. Forbidden fallback: tests must not call internal application APIs just to
   inject dependencies when doing so bypasses the compiled/public entrypoint
   under test. The fake actor must not write transcript, inbox, or state files
   directly.
5. Allowed resolution path: fakes may be injected through existing public
   dependency/port boundaries, fixture-local configuration, or explicit test
   harness environment wiring that preserves the public command route being
   tested.
6. Missing-data rule: if the runner cannot prove current handoff/execution
   authority before an actor emit, it must fail the smoke step rather than reuse
   a stale captured id or infer authority from transcript history.
7. Sequencing / boundary note:
   - producer-first rule: fake launch + runner contract must land before CLI,
     actor-loop, or UI action smoke scenarios consume it.
   - downstream consume families that remain separate: compiled CLI lifecycle,
     actor-loop ingestion, and UI action API dispatch are separate Phase 1 task
     families.
   - cleanup/recovery timing: Layer 3, failure-mode scenarios, HTTP transport,
     real browser coverage, commit/merge/approve happy path, and multi-round
     loops are deferred until Phase 1 is stable.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/architecture/almost-e2e-smoke-suite.md`
   - `src/cli/commands/agent/emit.ts`
   - `src/cli/index.ts`
   - `dist/cli/index.js`
   - `src/v11/ports/tmuxSessions.ts`
   - `src/v11/ports/processSpawn.ts`
   - `src/cli/commands/bubble/open.ts`
   - `src/v11/defaults/restart/restartCommandDefaults.ts`
2. Closed canonical elements / terms:
   - `pairflow agent emit --kind ...` is the only canonical actor feedback
     surface for the fake actor.
   - `dist/cli/index.js` is the Layer 1 compiled CLI entrypoint.
   - fake actors must not directly mutate transcript, inbox, or state.
   - before the first runner `advance(...)`, captured launch handoff/execution
     authority may be used only after validation against the public status/read
     model.
   - every later runner `advance(...)` must refresh handoff/execution authority
     from that public status/read-model surface rather than reuse launch
     metadata.
   - Layer 2 Phase 1 transport is in-process route/action invocation, not real
     HTTP and not Playwright.
3. Explicitly authorized reinterpretation: none. The plan turns the architecture
   document into executable task sequencing without changing its design choices.
4. Downstream task impact: every task must preserve the public-entrypoint
   surface it claims to test; any shortcut through private helpers is a task
   scope violation unless the task explicitly proves it is only test harness
   setup outside the validated path.

## Current Status

### Completed Work

1. The architecture document defines the suite purpose, fake/real boundary,
   public actor surface, runner-driven model, Phase 1 scope, decided choices,
   and open questions.
2. The fake launch and runner contract foundation is implemented and archived
   in task `1-smoke-runner-contract`; downstream smoke tasks may consume its
   fixture and fake-helper foundation while still proving their own public
   entrypoint coverage.

### Open Work

1. Compiled CLI lifecycle smoke scenarios do not exist.
2. Runner-driven fake actor-loop smoke does not exist.
3. In-process UI action API smoke scenarios do not exist.

### Deferred / Future Work

1. Layer 3 golden full-ish bubble smoke.
2. Failure-mode smoke scenarios.
3. Real HTTP transport smoke.
4. Real browser / Playwright smoke.
5. Full commit / merge / approve happy path and multi-round review loops.

## Progress / Phase Summary

1. Phase 0: architecture document exists and is ready to feed plan/task
   decomposition.
2. Phase 1: implement the minimal runner and smoke matrix.
3. Phase 2: expand only after Phase 1 proves runtime and stability.

Progress update (2026-05-09): document bubble
`1-smoke-runner-contract-doc` refined task `1-smoke-runner-contract` with
foundation-only capability closure, authority boundary mapping, baseline
preservation, closure-budget/task-shape proof, scope-reality proof, and a
later-hardening backlog. No product/runtime implementation scope was added.

Progress update (2026-05-09): document bubble
`2-cli-lifecycle-smoke-doc` refined task `2-cli-lifecycle-smoke` with explicit
implementation write targets, read-only source anchors, compiled-subprocess
fake boundary constraints, and source-hook route-back conditions. No
product/runtime implementation scope was added. A round-2 review refinement
also aligned the task validation requirements with the parent plan by requiring
`pnpm build` before positive compiled CLI smoke evidence is trusted, even for
test/helper-only implementation changes. A round-3 review refinement aligned
the L2 execution order with that same precondition by placing the fresh build
before the positive compiled CLI lifecycle sequence and keeping the
missing-build diagnostic as a separate negative-path assertion. A round-5
review refinement separated successor handoff wording so actor-loop work points
to task `3-actor-loop-smoke`, UI action work points to task
`4-ui-action-api-smoke`, kickoff/attach require explicit future planning, and
full commit/merge/approve happy path remains post-Phase-1 deferred scope. A
round-6 review refinement aligned Current Status/Open Work with the archived
runner-contract dependency by moving the fake launch and runner contract
foundation into Completed Work and leaving only the remaining Phase 1 smoke
scenarios open. A round-7 review refinement clarified that the missing-build
negative-path assertion must use a helper-parameterized or fixture-local absent
entrypoint and must not delete, move, or mutate the repository's real
`dist/cli/index.js` artifact.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-smoke-runner-contract` | `plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/1-smoke-runner-contract.md` | Build the fake process/editor spawn recorder, fake tmux launch/terminate adapter, runner-driven scenario advancement model, first-advance authority validation, post-first authority refresh, and TS scenario type contract. | `docs/architecture/almost-e2e-smoke-suite.md` | Provides the common fake-runner foundation required by all Phase 1 smoke tasks. | archived |
| `2-cli-lifecycle-smoke` | `plans/tasks/2-cli-lifecycle-smoke.md` | Add compiled-CLI smoke coverage for create/start, restart, open, and delete against a minimal fixture repo using the fake external adapters where needed. | `1-smoke-runner-contract` | Proves the top-level `dist/cli/index.js` route and defaults wiring for public CLI entrypoints. | in_progress |
| `3-actor-loop-smoke` | `null` | Add one minimal runner-driven fake actor scenario through pass, convergence, and meta-review approval, using canonical `pairflow agent emit --kind ...` feedback. | `1-smoke-runner-contract`, `2-cli-lifecycle-smoke` | Proves actor ingestion, authority refresh, transcript/state progression, and meta-review approval routing without a real LLM. | not_created |
| `4-ui-action-api-smoke` | `null` | Add in-process UI action API smoke coverage for Open, Restart, and Delete with real backend state and recorded external side effects. | `1-smoke-runner-contract`, `2-cli-lifecycle-smoke` | Proves UI action dispatch reaches the backend command paths that historically failed through Open/Restart. | not_created |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| No reusable way to run public-entrypoint smoke without real LLM/tmux/editor. | `1-smoke-runner-contract` | Must preserve public actor feedback through `pairflow agent emit --kind ...`; first advance validates launch authority against the public status/read-model, and later advances refresh from that surface. |
| Compiled CLI dispatch/defaults regressions can pass module-level tests. | `2-cli-lifecycle-smoke` | Must run against `dist/cli/index.js`, not only TS `runCli` imports. |
| Actor feedback ingestion can regress while fake tests pass if the fake writes artifacts directly. | `3-actor-loop-smoke` | Fake must use canonical actor emit CLI; transcript/state writes remain production-owned. |
| UI action dispatch regressions are not covered without browser tests. | `4-ui-action-api-smoke` | Phase 1 intentionally uses in-process route/action invocation; browser rendering remains out of scope. |
| Layer 3 and failure-mode coverage are valuable but could destabilize Phase 1. | Deferred | Revisit after Phase 1 runtime and flake rate are known. |

## Dependencies and Order

1. `1-smoke-runner-contract` must be first. It defines the fake launch,
   first-advance public authority validation, post-first authority refresh, and
   scenario model consumed by all other smoke tasks.
2. `2-cli-lifecycle-smoke` should run before actor-loop smoke because it proves
   the compiled CLI lifecycle baseline and fixture setup.
3. `3-actor-loop-smoke` depends on the runner contract and a reliable started
   fixture path from the CLI smoke work.
4. `4-ui-action-api-smoke` depends on the runner contract and should reuse the
   same fixture setup conventions, but it must remain separate from browser or
   HTTP transport coverage.
5. No task may expand Phase 1 to Layer 3, Playwright, real HTTP, multi-round
   loops, or commit/merge/approve happy path without plan refinement.

## Risks and Assumptions

1. The largest implementation risk is preserving compiled CLI coverage while
   still injecting fake external adapters. The preferred resolution is
   fixture-local configuration or environment-controlled fake agent command
   selection, not private application API shortcuts.
2. Running against `dist/cli/index.js` means build freshness matters. Smoke
   execution must either depend on a fresh build step or fail clearly when the
   compiled artifact is missing/stale.
3. The fake runner can become a second orchestration framework if Phase 1 grows
   too broad. Keep it runner-driven and explicit until a later phase proves an
   event-driven mode is necessary.
4. UI action API smoke may miss real browser/rendering bugs by design. That is
   acceptable for Phase 1 because the current target bug class is backend
   dispatch and command wiring.
5. The task identities in this plan are fresh V1 metadata ids; downstream task
   files must use the matching `sequence_key`, `task_family_id`, and derived
   `task_id` values.

## Validation Strategy

1. Runner contract task validation should include focused unit/integration tests
   proving fake launch registration, recorded process spawn behavior, scenario
   loading, first-advance public authority validation, post-first public
   authority refresh, and rejection when authority cannot be proven.
2. CLI lifecycle smoke validation must include a build step and execute the
   compiled CLI entrypoint for the covered commands.
3. Actor-loop smoke validation must assert transcript/state/inbox changes are
   produced by canonical actor emit routes, not direct artifact writes.
4. UI action API smoke validation must assert route/action payloads use the same
   shape as the UI and reach the same backend command paths while recording
   editor/terminal side effects instead of launching them.
5. Full repo validation for tasks that add source code should follow the repo
   default order: `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`,
   relevant narrow tests, affected suites, `pnpm test`, and `pnpm build`, with
   skipped steps explicitly justified.
