---
artifact_type: task
artifact_id: task_cli_lifecycle_smoke
task_family_id: cli-lifecycle-smoke
sequence_key: "2"
task_id: 2-cli-lifecycle-smoke
title: "CLI Lifecycle Smoke"
status: implementable
phase: phase1
system_context_ref: docs/architecture/almost-e2e-smoke-suite.md
target_files:
  - tests/almostE2e/
  - tests/almostE2e/cliLifecycleSmoke.test.ts
  - tests/helpers/almostE2eSmoke/
  - tests/helpers/almostE2eSmoke/index.ts
target_files_role: write_targets_with_read_only_anchors
target_write_files:
  - tests/almostE2e/
  - tests/almostE2e/cliLifecycleSmoke.test.ts
  - tests/helpers/almostE2eSmoke/
  - tests/helpers/almostE2eSmoke/index.ts
target_read_only_anchors:
  - docs/architecture/almost-e2e-smoke-suite.md
  - plans/almost-e2e-smoke-suite-plan-v1.md
  - plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/1-smoke-runner-contract.md
  - src/cli/index.ts
  - src/cli/commands/bubble/open.ts
  - src/cli/commands/bubble/createCliOptions.ts
  - src/v11/defaults/restart/restartCommandDefaults.ts
  - src/config/pairflowConfig.ts
  - src/config/bubbleConfig.ts
prd_ref: null
plan_ref: plans/almost-e2e-smoke-suite-plan-v1.md
doc_bubble_id: 2-cli-lifecycle-smoke-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-09-almost-e2e-smoke-suite-plan-v1
owners:
  - "testing/runtime"
---

# Task: CLI Lifecycle Smoke

## L0 - Policy

### Goal

Add the first compiled-CLI lifecycle smoke coverage for Pairflow public bubble
entrypoints. The smoke must run against `dist/cli/index.js` and cover create,
start, restart, open, and delete against an isolated fixture repository while
using the fake external-adapter foundation from `1-smoke-runner-contract`.

### Domain / Control Model Summary

1. Business invariant: compiled public CLI wiring regressions must fail in a
   fast deterministic smoke test before they reach maintainers or CI.
2. Control model: command dispatch, option parsing, bubble registry/state,
   transcript routing, dependency-default wiring, and lifecycle persistence
   remain production-owned. The test may fake only external side effects at the
   established adapter boundaries.
3. Read-path rule: lifecycle assertions must read state through public
   CLI/status or the same fixture-visible read-model used by the CLI. The test
   must not assert success by inspecting private implementation shortcuts that
   the compiled entrypoint bypasses.
4. Forbidden fallback: do not replace the compiled CLI path with `runCli` or
   lower-level application imports for the behavior being claimed. Do not fake
   bubble state, transcript, inbox, registry, or execution context writes.
5. Allowed resolution path: fixture-local configuration, environment-controlled
   fake adapter wiring, and the helper contract under
   `tests/helpers/almostE2eSmoke/**` may be used when they preserve the
   compiled CLI entrypoint under test.
6. Missing-data rule: if the fixture cannot prove that a lifecycle command
   reached the expected public state transition, the smoke must fail clearly
   instead of inferring success from recorded adapter calls alone.

### In Scope

1. Add a compiled-CLI smoke test for bubble create/start, restart, open, and
   delete.
2. Execute the CLI through `node dist/cli/index.js` or an equivalent helper that
   records that exact entrypoint and argv.
3. Reuse `tests/helpers/almostE2eSmoke/**` fixture and fake external-adapter
   helpers where they preserve the compiled CLI route.
4. Assert that lifecycle state and registry artifacts are created, updated, and
   removed by production command handling.
5. Assert fake external side effects for tmux/session launch, restart/open
   command attempts, and termination without launching real tmux, editors, or
   terminals.
6. Add focused assertions that build freshness is required or clearly diagnosed
   when `dist/cli/index.js` is missing.
7. Reconcile the architecture document's broader Layer 1 command family with
   this task's Phase 1 minimal slice by covering only create/start,
   restart/open/delete here. Successor ownership is intentionally split:
   actor-loop pass/convergence/meta-review approval belongs to
   `3-actor-loop-smoke`; UI Open/Restart/Delete action dispatch belongs to
   `4-ui-action-api-smoke`; kickoff and attach require explicit future
   successor planning if they remain desired; full commit/merge/approve happy
   path stays post-Phase-1 deferred scope unless the parent plan is refined.

### Out of Scope

1. Runner-driven fake actor loop through pass/convergence/meta-review.
2. UI action API smoke coverage.
3. Layer 3 golden full-ish smoke, HTTP transport, Playwright, real browser, real
   tmux/editor execution, multi-round loops, and commit/merge/approve happy
   path.
4. Changing production lifecycle semantics, command option contracts, or default
   adapter ownership to make the smoke easier to write.
5. Adding source-level test hooks for create/open/restart/start/delete unless
   the implementation first returns to task refinement with exact target files,
   default-behavior preservation proof, and focused tests for the new hook.

## L1 - Change Contract

### Canonical Contract Matrix

| Contract Row | Canonical Rule | Producer / Storage | Runtime Behavior | Failure / Reason Code | Required Proof |
|---|---|---|---|---|---|
| Compiled CLI entrypoint | The smoke runs the compiled `dist/cli/index.js` path for covered lifecycle commands. | Test helper or smoke test command invocation. | Public option parsing and command dispatch are exercised as shipped. | Fail clearly when the built artifact is absent or stale enough to make the smoke meaningless. | Test assertions record entrypoint path and argv for create/start/restart/open/delete. |
| Fixture repository | The smoke uses an isolated git repo and Pairflow state root, not the developer checkout. | `tests/helpers/almostE2eSmoke/fixtureRepo.ts` or direct successor helper. | Lifecycle commands can create and delete bubbles without mutating the real repo. | Fixture setup fails with the fixture path and command summary. | Test proves repo init, baseline commit, Pairflow config/state path, and cleanup. |
| Fake external adapters | Only tmux/process/editor/terminal side effects are faked at existing ports. | Fake adapter wiring inherited from the runner-contract helper. | Commands record launch/open/restart/delete side effects without real external processes. | Fail when a real external command is attempted unexpectedly. | Assertions inspect recorded fake side effects. |
| Lifecycle persistence | Bubble registry/state/transcript changes remain production-owned. | Compiled CLI command handling. | Create/start/restart/open/delete change or read lifecycle state through production paths. | Fail when public status/read-model does not match expected lifecycle outcome. | Assertions read status/list or fixture-visible production artifacts after each command. |
| Scope boundary | This task ships lifecycle smoke only. | `tests/almostE2e/cliLifecycleSmoke.test.ts` and helper extensions. | Successor actor-loop and UI smokes consume this baseline later. | Review failure if the task expands into actor feedback, meta-review, browser, or UI action coverage. | Test names and assertions stay limited to lifecycle commands. |

### Ownership and Deferred Semantics

1. This task owns the compiled CLI lifecycle smoke and any minimal helper
   extension required to invoke `dist/cli/index.js` deterministically.
2. It does not own actor feedback ingestion, fake scenario advancement,
   meta-review approval routing, or UI route/action dispatch.
3. It may add a test command or narrow package script only if that command is
   needed for maintainers or CI to run the smoke consistently.
4. It must preserve the fake/real boundary created by
   `1-smoke-runner-contract`; helper extensions may expose lifecycle-specific
   setup, but must not add hidden state mutation shortcuts.
5. Build freshness remains explicit: either the smoke depends on an existing
   build step or fails with an actionable missing/stale artifact diagnostic.

### Capability Closure

| Capability Claim | Closure Classification | Activation / Entrypoint | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| Maintainers can run a Phase 1 compiled CLI lifecycle smoke for create/start, restart, open, and delete. | end_to_end | Root Vitest execution of `tests/almostE2e/cliLifecycleSmoke.test.ts` invoking `node dist/cli/index.js`. | Fixture repo, PATH-shim fake external commands, lifecycle smoke test, and optional helper exports. | Node/pnpm environment and fresh compiled CLI build artifact. | This task must provide passing focused smoke evidence plus normal validation evidence for changed tests/helpers. |
| Actor-loop and UI smoke tasks can reuse a reliable lifecycle fixture baseline. | foundation_only | Imports from the smoke helper/fixture setup. | Fixture conventions, compiled-CLI invocation helper, and fake side-effect record files. | Successor tasks still need their own scenario/API coverage. | This task proves lifecycle baseline only; successor tasks own their own closure. |

### Authority Boundary Map

| Boundary Bucket | In Scope For This Task | Explicit Rule |
|---|---|---|
| Public entrypoint | Yes. | Covered lifecycle behavior must invoke `node dist/cli/index.js`; TS command imports may be used only for unrelated helper tests. |
| External side effects | Yes, via fixture-local executable shims. | Place shim binaries earlier in `PATH` for commands such as `tmux`, editor/open launchers, or terminal launchers, and record calls to fixture-local JSONL files. |
| Production lifecycle persistence | Yes, as observed behavior only. | Registry, bubble state, transcript, runtime sessions, and cleanup are written by compiled CLI command handling, not by the test harness. |
| Helper in-memory fake ports | Limited. | Existing in-memory fake adapters may shape expectations and helper APIs, but they are not the compiled subprocess injection mechanism unless the compiled CLI exposes that port. |
| Fixture config/env | Yes. | Fixture-local config and environment variables may select fake external commands and isolated state roots, but must not alter global developer config. |
| Package scripts | No by default. | Do not edit `package.json`; run the smoke through existing test commands unless implementation proves a dedicated script is necessary and updates this task first. |
| Successor smoke semantics | Deferred. | Actor-loop ingestion and UI action API dispatch remain in tasks `3-actor-loop-smoke` and `4-ui-action-api-smoke`. |
| Source defaults/hooks | No by default. | `src/**`, config parsers, command option contracts, and runtime defaults are read-only anchors for this task. If a compiled subprocess side effect cannot be faked through existing config/env/PATH boundaries, stop and refine this task instead of adding a hook opportunistically. |

### Baseline Preservation

| Must Preserve | Allowed Resolution Path | Forbidden Regression Interpretation | Replacement Proof Required If Removed |
|---|---|---|---|
| `dist/cli/index.js` is the Layer 1 compiled CLI entrypoint. | Invoke it with structured argv from tests. | Treating TS imports or private handlers as equivalent compiled CLI coverage. | Plan update naming a new compiled public entrypoint and updating successor tasks. |
| Fake external adapters replace only slow external side effects. | Use established process/tmux/open/terminate fake ports. | Direct registry/state/transcript writes as a lifecycle shortcut. | Source-level proof of a new public test harness boundary and plan refinement. |
| Phase 1 excludes actor-loop, UI, HTTP, Playwright, and Layer 3. | Keep this task focused on lifecycle command wiring. | Adding broader scenario coverage here and claiming Phase 1 complete. | Plan/task refinement that changes sequencing and done wording. |

### Compiled CLI Fake Adapter Mechanism

The compiled CLI runs in a subprocess and therefore cannot consume the
in-memory fake ports from `tests/helpers/almostE2eSmoke/fakeExternalAdapters.ts`
unless a public dependency hook exists for that exact command. This task's
default implementation path is fixture-local executable shims:

1. create a temporary shim directory under the fixture root
2. prepend that directory to `PATH` for the compiled CLI subprocess only
3. provide executable shims for external commands reached by create/start,
   restart, open, and delete, including `tmux` and any configured editor,
   terminal, or opener command
4. write every shim invocation as structured JSONL into the fixture's side
   effect log
5. assert the compiled CLI subprocess uses the shimmed external commands while
   production Pairflow state files are still created and removed by the CLI

Open-command fake setup must prefer an existing fixture-local configuration
boundary. If the current compiled `bubble create` command cannot set
`open_command` directly, the smoke may seed the fixture's Pairflow/bubble
configuration only through normal config files read by the compiled CLI. It
must not mutate created bubble state files after creation to make `open` pass.

If this shim/config path cannot cover a command because the production code does
not route that side effect through an executable, fixture config, or existing
environment boundary, the implementation must stop and refine this task before
adding production wiring. Any production env/default hook would expand
`target_write_files` to the exact `src/**` defaults or CLI wiring files and
require tests proving default behavior is unchanged outside the fixture.

### Scope-Reality Proof

1. Inspected compiled CLI dispatch anchors include `src/cli/index.ts`
   handlers for `bubble start`, `bubble open`, `bubble restart`, and
   `bubble delete`.
2. `src/cli/commands/bubble/open.ts` exposes a dependency parameter for
   module-level tests, but the compiled CLI handler calls it without injected
   test dependencies, so compiled subprocess coverage must use a process/env
   boundary such as fixture-local `PATH` shims.
3. `src/v11/defaults/restart/restartCommandDefaults.ts` delegates restart
   defaults through production infrastructure, so restart smoke must prove fake
   termination through an external-command/config boundary or stop for task
   refinement before changing production defaults.
4. Existing `tests/helpers/almostE2eSmoke/fakeExternalAdapters.ts` proves the
   fake side-effect shape for in-process helpers; this task may reuse its
   record schema, but compiled CLI side effects must be recorded from the
   subprocess boundary.
5. Existing `src/cli/commands/bubble/createCliOptions.ts` does not expose an
   `--open-command` flag at task-review time. The implementation must therefore
   either use an existing fixture config boundary for `open_command` or return
   for task refinement before adding CLI/source support.
6. Precondition before side effect: the smoke must verify `dist/cli/index.js`
   exists and the fixture/shim environment is installed before running the
   first lifecycle command.
7. Rollback/cleanup: the test must delete the created bubble and clean fixture
   temp paths it owns. It must never delete or mutate the developer checkout's
   `.pairflow` state.
8. Actual implementation scope remains compiled CLI lifecycle smoke only:
   create/start/restart/open/delete. Actor feedback, meta-review, UI route
   dispatch, HTTP, Playwright, and Layer 3 remain out of scope.
9. The runner-contract task is archived, and its current helper implementation
   is an in-process foundation. This task may extend helper exports, but the
   compiled CLI subprocess proof must be new here and must not claim the
   archived helper's in-memory ports as compiled CLI coverage.

### Closure Budget and Task Shape

| Gate | Result |
|---|---|
| Closure buckets touched | Gate buckets: `shared_contract`, `internal_execution_consumers`, `read_model_consumers`, and `cleanup_recovery_consumers`. Local mapping: compiled CLI invocation and shim helper API -> `shared_contract`; fixture lifecycle command execution -> `internal_execution_consumers`; public status/read-model assertions -> `read_model_consumers`; delete/fixture cleanup proof -> `cleanup_recovery_consumers`. The fake external shim boundary is a test-helper side-effect mechanism represented under `shared_contract`, not a separate closure-budget bucket. |
| Collapsed closures | Keep compiled CLI invocation, fixture setup, and PATH-shim side-effect recording together because they form one lifecycle smoke contract and are exercised by one smoke sequence. |
| Deferred closures | Actor-loop pass/convergence/meta-review, UI action API smoke, real HTTP/browser coverage, Layer 3, and commit/merge/approve happy path. |
| Primary bounded-task shape | `activation_or_read_model`, because the task activates public compiled CLI lifecycle coverage and verifies public lifecycle read state. |
| Secondary shape | `contract_or_persisted_authority_foundation`, limited to helper/shim contracts inherited by successor smoke tasks. |
| Split decision | Do not split now. The CLI lifecycle sequence is a single public-entrypoint family; splitting before the first smoke exists would add coordination without reducing contract risk. |

### Complexity Risk

| Axis | Risk Score | Rationale |
|---|---:|---|
| `authority_risk` | 0 | The task observes production lifecycle authority and must avoid fake state writes, but it does not change authority producers or persisted schema. |
| `surface_spread` | 1 | The same smoke concept spans three task-owned surfaces: compiled CLI invocation helper/test, fixture setup, and shim side-effect log assertions. It does not require production config/schema, routing, read projection, payload, or UI/API changes. |
| `identity_join_risk` | 1 | Bubble id, fixture repo path, shim log path, and state root must match through one stable fixture identity path. There are no competing legacy/new identity seams. |
| `activation_coupling` | 0 | The task activates test coverage only on stable lifecycle seams; it does not couple a production refactor/foundation change with new runtime behavior. |
| `prerequisite_risk` | 1 | It depends on the completed runner/fake helper foundation and existing CLI lifecycle defaults, but not on actor-loop or UI tasks. |
| `acceptance_multiplicity` | 1 | Acceptance has three success classes: compiled entrypoint proof, lifecycle state/read proof, and fake side-effect/cleanup proof. |
| `risk_score` | 4 | Sum of axis scores is 4, so a single task is acceptable under the gate. |

Complexity gate decision:

1. `single-task allowed`: yes.
2. `authority_change`: none; production lifecycle authority is observed, not
   moved.
3. `surface_count`: 3 task-owned test/helper surfaces.
4. `feature_activation`: test activation only; no production runtime activation.
5. `prerequisite_boundaries`: depends on archived task
   `1-smoke-runner-contract`; actor-loop and UI successor tasks remain
   deferred.
6. `authority_fanout`: internal execution consumers, read-model consumers, and
   cleanup/recovery consumers are observed by the smoke; no authority producer
   or persisted schema changes.
7. `split decision`: no split required because the smoke covers one compiled
   CLI lifecycle command family and does not change production authority,
   persisted schema, public payloads, or UI/API consumers.

| Risk | Constraint |
|---|---|
| Compiled subprocess cannot use in-memory fake ports. | Prefer fixture-local `PATH` shims and side-effect logs; refine before adding production dependency hooks. |
| Fake side-effect success can mask lifecycle failure. | Assert production-owned state/read-model after each CLI command, not only shim records. |
| Cleanup commands can touch real developer state. | Fixture repo and state roots must be isolated, and assertions must prove paths are under the fixture. |
| Build freshness can make smoke results meaningless. | Missing `dist/cli/index.js` must fail with an actionable diagnostic before lifecycle commands run. |
| Scope creep into actor/UI smoke. | Keep test names, helper APIs, and assertions limited to create/start/restart/open/delete. |

## L2 - Execution Plan

1. Inspect existing CLI command entrypoints, fake helper exports, and fixture
   setup from `1-smoke-runner-contract`.
2. Add or extend a helper for invoking `node dist/cli/index.js` with structured
   argv and isolated environment variables for fake external adapters.
3. Add a missing-build diagnostic assertion for the helper's negative path
   before positive smoke evidence is collected. This assertion must exercise the
   absent-artifact diagnostic only and must not be reported as lifecycle smoke
   success. It must use a helper-parameterized missing entrypoint or
   fixture-local nonexistent path; it must not delete, rename, move, or
   otherwise mutate the repository's real `dist/cli/index.js` artifact.
4. Run `pnpm build` before any positive compiled CLI lifecycle sequence is
   executed or trusted, including when the implementation changes only
   tests/helpers.
5. Create a fixture repo for the smoke and run the lifecycle sequence:
   create -> start -> restart -> open -> delete.
6. Assert production-owned state after each lifecycle transition and assert fake
   external side-effect records for commands that would normally launch tmux,
   terminals, editors, or kill sessions.
7. Run focused lifecycle smoke tests after the fresh build, then the
   repository's relevant validation for changed tests/helpers.

## Validation Requirements

1. Focused CLI lifecycle smoke test passes.
2. Existing almost-e2e helper tests still pass if helper exports change.
3. `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, and `pnpm test`
   pass unless a narrower explicit exception is recorded by the bubble.
4. `pnpm build` must run before positive compiled CLI lifecycle smoke evidence
   is trusted, even when the implementation changes only tests/helpers. The
   smoke's claim is compiled public entrypoint coverage, so evidence from an
   existing or stale `dist/cli/index.js` artifact is not sufficient.
5. The missing-build diagnostic assertion is still required as a negative-path
   test, but it does not replace the fresh-build precondition for the positive
   lifecycle sequence. The negative-path setup must be idempotent and must not
   mutate `dist/**`; simulate the absent entrypoint through helper parameters or
   fixture-local paths instead.

## Review Checklist

1. The smoke really invokes `dist/cli/index.js` for the covered behavior.
2. The fixture does not mutate the developer checkout or require real tmux,
   editor, terminal, browser, HTTP server, or LLM process.
3. Assertions prove lifecycle state through production/public surfaces, not fake
   state mutation.
4. Helper additions preserve the fake/real boundary and do not widen Phase 1.
5. Build freshness and missing-artifact behavior are explicit.
