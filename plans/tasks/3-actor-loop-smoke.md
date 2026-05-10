---
artifact_type: task
artifact_id: task_actor_loop_smoke
task_family_id: actor-loop-smoke
sequence_key: "3"
task_id: 3-actor-loop-smoke
title: "Actor Loop Smoke"
status: in_progress
phase: phase1
system_context_ref: docs/architecture/almost-e2e-smoke-suite.md
target_files:
  - tests/almostE2e/
  - tests/almostE2e/actorLoopSmoke.test.ts
  - tests/helpers/almostE2eSmoke/
  - tests/helpers/almostE2eSmoke/index.ts
target_files_role: write_targets_with_read_only_anchors
target_write_files:
  - tests/almostE2e/
  - tests/almostE2e/actorLoopSmoke.test.ts
  - tests/helpers/almostE2eSmoke/
  - tests/helpers/almostE2eSmoke/index.ts
target_read_only_anchors:
  - docs/architecture/almost-e2e-smoke-suite.md
  - plans/almost-e2e-smoke-suite-plan-v1.md
  - plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/1-smoke-runner-contract.md
  - plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/2-cli-lifecycle-smoke.md
  - src/cli/commands/agent/emit.ts
  - src/cli/index.ts
  - tests/helpers/almostE2eSmoke/runner.ts
  - tests/helpers/almostE2eSmoke/scenario.ts
  - tests/helpers/almostE2eSmoke/fixtureRepo.ts
  - tests/almostE2e/cliLifecycleSmoke.test.ts
prd_ref: null
plan_ref: plans/almost-e2e-smoke-suite-plan-v1.md
doc_bubble_id: 3-actor-loop-smoke-doc
impl_bubble_id: 3-actor-loop-smoke-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-09-almost-e2e-smoke-suite-plan-v1
owners:
  - "testing/runtime"
---

# Task: Actor Loop Smoke

## L0 - Policy

### Goal

Add one minimal runner-driven fake actor-loop smoke that reaches implementer
pass, reviewer convergence, and meta-review `approve` recommendation through
the canonical `pairflow agent emit --kind ...` feedback surface. The smoke must
prove actor feedback ingestion, authority refresh, transcript/state progression,
and approval-ready routing without a real LLM, real tmux interaction, real
editor, real browser, or direct state-file mutation by the fake actor.

### Domain / Control Model Summary

1. Business invariant: the suite must catch regressions where public actor
   feedback no longer advances Pairflow lifecycle state even though lower-level
   unit tests still pass.
2. Control model: Pairflow command dispatch, actor emit parsing, inbox and
   transcript writes, execution-context transitions, round progression, and
   meta-review `approve` recommendation routing to `READY_FOR_HUMAN_APPROVAL`
   remain production-owned.
3. Read-path rule: every runner advance after launch must refresh current
   handoff and execution authority from the public status/read-model surface
   before invoking `pairflow agent emit --kind ...`.
4. Forbidden fallback: the fake actor must not write transcript, inbox, state,
   registry, or execution-context files directly. It must not use private
   handlers as a substitute for the CLI actor feedback surface being claimed.
5. Allowed resolution path: fixture-local configuration, compiled/public CLI
   invocation helpers, and the existing almost-e2e smoke runner may be extended
   when they preserve the public actor emit path and isolated fixture repo.
6. Missing-data rule: if current authority cannot be proven before an emit, the
   smoke must fail the step rather than reusing stale launch metadata or
   inferring authority from transcript history.
7. Approval-gate policy rule: because the default meta-review clean-run
   requirement may require two consecutive clean approvals, this minimal
   one-loop smoke must use fixture-local policy/configuration that makes a
   single clean `meta_review_result --recommendation approve` sufficient for
   `READY_FOR_HUMAN_APPROVAL`, and it must assert that policy value before
   claiming the final gate.

### In Scope

1. Add a focused almost-e2e smoke for one minimal actor loop that starts from a
   fixture bubble and advances through implementer pass, reviewer convergence,
   and meta-review `approve` recommendation.
2. Use the fake runner contract from `1-smoke-runner-contract` and the lifecycle
   fixture baseline from `2-cli-lifecycle-smoke`.
3. Invoke actor feedback through the canonical public surface,
   `pairflow agent emit --kind ...`, for covered fake actor responses:
   `pass`, `convergence`, and `meta_review_result`.
4. Assert production-owned transcript, state, inbox, and execution-context
   progression through public status/read-model surfaces or fixture-visible
   production artifacts.
5. Keep the scenario minimal: one happy-path progression through pass,
   convergence, meta-review clean `approve` result, and the resulting
   approval-ready gate, observed as `READY_FOR_HUMAN_APPROVAL` in the public
   status/read-model surface.
6. Configure or seed only fixture-local meta-review policy so this minimal
   scenario can reach `READY_FOR_HUMAN_APPROVAL` from one clean
   `meta_review_result` approve; do not change repository defaults or
   production policy semantics.
7. Preserve fast deterministic execution suitable for regular PR use.

### Out of Scope

1. UI action API smoke coverage.
2. Browser, HTTP transport, Playwright, and Layer 3 golden full-ish smoke.
3. Real LLM, tmux, editor, or terminal execution.
4. Multi-round review loops, failure-mode scenarios, request-rework flows,
   human approval, and full commit/merge lifecycle closure.
5. Changing production lifecycle semantics, command option contracts, or
   private state persistence to make the smoke easier to write.
6. Adding source-level actor/test hooks unless the task first returns to
   refinement with exact target files and preservation tests for default
   behavior.

## L1 - Change Contract

### Canonical Contract Matrix

| Contract Row | Canonical Rule | Producer / Storage | Runtime Behavior | Failure / Reason Code | Required Proof |
|---|---|---|---|---|---|
| Actor feedback surface | Fake actor feedback must enter through `pairflow agent emit --kind ...`, including `pass`, `convergence`, and `meta_review_result`. The `meta_review_result` step must provide the public command's required authority and payload fields, including `--handoff-id`, `--execution-id`, `--round`, `--recommendation approve`, `--summary`, and `--report-json`. | Runner helper invoking the public CLI command. | Production actor feedback parsing and dispatch writes lifecycle artifacts. | Fail when a scenario step bypasses the emit command, omits required public CLI payload fields, or cannot prove current authority. | Test records emit argv/kind and validates state after each step. |
| Authority refresh | Runner refreshes handoff/execution authority before every post-launch advance. | Public status/read-model surface. | Stale handoff ids are rejected instead of reused. | Fail with a missing-authority diagnostic. | Assertions prove refreshed authority source per advance. |
| Lifecycle progression | Pass, convergence, and meta-review `approve` recommendation progression are production-owned. | Pairflow transcript/state/inbox/registry artifacts plus fixture-local review policy. | State advances through the expected actor loop into `READY_FOR_HUMAN_APPROVAL` without direct fake writes under an asserted single-clean meta-review policy. | Fail when production state or transcript does not match the scenario step, when the fixture policy does not prove a single clean approve is sufficient, or when public status/read-model does not expose `READY_FOR_HUMAN_APPROVAL` after the approve recommendation. | Assertions read public status/read-model or fixture-visible production artifacts, and assert the fixture meta-review clean-run requirement before the final emit. |
| Fake boundary | Only external slow side effects are faked. | Existing almost-e2e fake adapters and fixture-local shims. | No real LLM/tmux/editor/browser is launched. | Fail when an unexpected external command is attempted. | Fake side-effect records remain bounded to external adapters. |
| Scope boundary | This task ships actor-loop smoke only. | `tests/almostE2e/actorLoopSmoke.test.ts` and helper extensions. | UI action, human approval, full close, and Layer 3 coverage remain successor/deferred work. | Review failure if this task claims UI, HTTP, browser, human approval, or full close coverage. | Test names and assertions stay limited to actor-loop progression. |

### Ownership and Deferred Semantics

1. This task owns the first runner-driven actor-loop smoke and any minimal
   helper extension needed to drive actor emit commands deterministically.
2. It consumes, but does not redefine, the runner scenario contract and
   compiled CLI lifecycle fixture baseline from the first two smoke tasks.
3. It does not own UI action dispatch, HTTP transport, browser rendering,
   failure-mode matrices, human approval, or full approve/commit/merge closure.
4. It may broaden helper exports only when the new surface is actor-loop
   specific and does not mutate production lifecycle files directly.
5. Build freshness remains explicit: positive actor-loop smoke evidence must
   be trusted only after a fresh `pnpm build` when the scenario invokes compiled
   CLI artifacts.

### Capability Closure

| Capability Claim | Closure Classification | Activation / Entrypoint | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| Maintainers can run a Phase 1 actor-loop smoke that proves public actor emit wiring through pass, convergence, and meta-review `approve` recommendation routing to `READY_FOR_HUMAN_APPROVAL` under explicit fixture-local single-clean meta-review policy. | end_to_end | Root Vitest execution of `tests/almostE2e/actorLoopSmoke.test.ts` using the almost-e2e runner and public actor emit CLI. | Fixture repo, fake external adapters, runner scenario, actor-loop smoke test, fixture-local review policy, and minimal helper exports. | Node/pnpm environment and fresh build when compiled CLI is invoked. | Passing focused smoke evidence plus normal validation evidence for changed tests/helpers. |
| Downstream UI action smoke can rely on a fixture baseline that has already proven actor feedback progression separately. | foundation_only | Imports from the smoke helper/fixture setup. | Shared fixture conventions and actor-loop scenario proof. | Successor UI task still needs its own route/action API coverage. | This task proves actor-loop progression only; `4-ui-action-api-smoke` owns UI action closure. |

### Authority Boundary Map

| Boundary Bucket | In Scope For This Task | Explicit Rule |
|---|---|---|
| Public actor surface | Yes. | Covered actor responses must invoke `pairflow agent emit --kind ...`; internal handlers may be used only for unrelated helper tests. |
| Public read model | Yes. | Authority refresh and lifecycle assertions must read through status/read-model surfaces or fixture-visible production artifacts. |
| Production lifecycle persistence | Yes, as observed behavior only. | Transcript, inbox, state, execution context, and registry writes are production-owned. |
| Fixture meta-review policy | Yes. | The fixture may set the clean-run requirement to one for this smoke, but repository defaults and production routing semantics must remain unchanged. |
| Fake runner | Yes. | The runner may sequence scenario steps and invoke public commands, but it may not mutate lifecycle artifacts directly. |
| External side effects | Yes, via existing fake boundaries. | Fake only slow external adapters; reject unexpected real process/editor/tmux/browser attempts. |
| Package scripts | No by default. | Do not edit `package.json`; use existing test commands unless this task is refined first. |
| UI action semantics | Deferred. | Open/Restart/Delete UI action API smoke remains in `4-ui-action-api-smoke`. |
| Full close lifecycle | Deferred. | Human approval plus commit/merge happy path beyond `READY_FOR_HUMAN_APPROVAL` stays post-Phase-1 unless the parent plan is refined. |

### Baseline Preservation

| Must Preserve | Allowed Resolution Path | Forbidden Regression Interpretation | Replacement Proof Required If Removed |
|---|---|---|---|
| `pairflow agent emit --kind ...` is the canonical actor feedback surface. | Invoke it from the runner for fake actor responses. | Treating direct transcript/inbox/state writes as equivalent actor-loop coverage. | Plan update naming a new public feedback surface and updating successor tasks. |
| Runner authority must refresh after launch. | Read current authority from public status/read-model before each advance. | Reusing launch metadata for later actor emits. | Focused tests proving a new public authority source and plan refinement. |
| Phase 1 excludes UI, HTTP, browser, Layer 3, and full close coverage. | Keep this task focused on actor-loop progression. | Expanding this task into broader scenarios and claiming Phase 1 complete. | Plan/task refinement that changes sequencing and done wording. |

## L2 - Implementation Plan

1. Inspect the existing runner, scenario, fixture, compiled CLI helper, and
   actor emit command contracts.
2. Add a minimal actor-loop scenario helper only where the existing runner
   cannot express the needed pass/convergence/meta-review steps.
3. Add `tests/almostE2e/actorLoopSmoke.test.ts` that sets up an isolated
   fixture bubble with meta-review clean-run requirement configured to one,
   runs the scenario through public actor emit commands (`pass`, `convergence`,
   `meta_review_result`), and asserts refreshed status/read-model progression
   after each step. Before every post-launch emit, the runner must refresh or
   prove current authority from the public status/read-model surface and pass
   the current `--handoff-id` and `--execution-id` to the emit command. The
   `meta_review_result` emit must also include required `--round`,
   `--recommendation approve`, `--summary`, and `--report-json` payload fields.
   The final assertion must observe `READY_FOR_HUMAN_APPROVAL` through the
   public status/read-model surface after the meta-review approve result, and
   must fail if the fixture policy/read-model still requires a second clean
   meta-review approval.
4. Assert that fake actors do not write lifecycle artifacts directly and that
   unexpected real external side effects fail the test.
5. Keep helper exports narrow and actor-loop focused.

### Validation Requirements

1. Run `pnpm build` before trusting positive compiled/public CLI smoke
   evidence.
2. Run the focused actor-loop smoke test.
3. Run relevant almost-e2e helper tests touched by this task.
4. Run `pnpm typecheck`, `pnpm lint`, and `pnpm fitness:check:ci`.
5. Run `pnpm test` before declaring the implementation complete.
6. If any validation step is skipped or fails, record the exact command and the
   reason in the bubble handoff.

### Review / Route-Back Conditions

Return for task or plan refinement instead of adding opportunistic production
hooks when:

1. the current public actor emit command cannot express a required fake actor
   response;
2. authority refresh cannot be read from a public status/read-model surface;
3. preserving compiled/public entrypoint coverage would require modifying
   `src/**`, command defaults, or runtime persistence outside the current
   `target_write_files`;
4. the scenario cannot reach `READY_FOR_HUMAN_APPROVAL` from a
   single `meta_review_result` approve recommendation, its required public CLI
   payload fields, and fixture-local single-clean policy without changing
   lifecycle semantics or repository defaults;
5. the work would naturally expand into UI action, HTTP, browser, Layer 3, or
   full close lifecycle coverage.
