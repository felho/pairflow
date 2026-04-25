---
artifact_type: task
artifact_id: task_done_package_live_reference_cleanup_v1
title: "Done Package Live Reference Cleanup"
status: implementable
phase: phase5
target_files:
  - "src/types/protocol.ts"
  - "src/v11/shared/protocol/validators.ts"
  - "src/v11/shared/protocol/protocolPayloadValidation.ts"
  - "src/v11/shared/protocol/protocolPayloadValidationHelpers.ts"
  - "src/v11/application/start/startCommandContext.ts"
  - "src/v11/application/start/startCommandImplementerPrompts.ts"
  - "src/v11/application/start/startCommandResumeImplementerPrompt.ts"
  - "src/v11/application/start/startCommandTmuxLaunch.ts"
  - "src/v11/application/commit/commitDonePackage.ts"
  - "src/v11/infrastructure/executor/ssh/sshBubbleStatusPayloadSupport.ts"
  - "src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.ts"
  - "src/v11/infrastructure/ui/presenters/timelinePresenter.ts"
  - "src/index.ts"
  - "README.md"
  - "docs/pairflow-initial-design.md"
  - "docs/remote-bubble-execution.md"
  - "tests/core/protocol/validators.test.ts"
  - "tests/cli/bubbleCommitCommand.test.ts"
  - "tests/cli/index.test.ts"
  - "tests/contracts/v11/commit.contract.runner.ts"
  - "tests/contracts/v11/commit.contract.test.ts"
  - "tests/core/bubble/startBubble.test.ts"
  - "tests/core/bubble/deleteBubble.test.ts"
  - "tests/v11/application/start/startCommandSession.test.ts"
  - "tests/v11/application/start/startCommandRemoteExecution.test.ts"
  - "tests/v11/application/start/startCommandOrchestration.test.ts"
  - "tests/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.test.ts"
  - "tests/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.test.ts"
prd_ref: null
plan_ref: plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Done Package Live Reference Cleanup

## L0 - Policy

### Goal

Remove the remaining live first-party `done-package` / `DONE_PACKAGE` references now that local commit, remote commit, and started-remote partial-success repair all use `COMMIT_RESULT`.

After this task, live Pairflow runtime guidance, protocol validation, CLI expectations, first-party tests, README, and active architecture docs must describe commit completion through `COMMIT_RESULT` technical facts. They must not instruct agents, operators, validators, or tests to produce, review, accept, or depend on `artifacts/done-package.md` as a commit completion boundary.

### Domain / Control Model Summary

1. Business invariant: a bubble commit is complete because Pairflow creates or proves a git commit, emits `COMMIT_RESULT`, and reaches `DONE`; a prose done-package is not commit authority.
2. Control model: active protocol and runtime-generated instructions control first-party commit behavior. Live docs and tests must agree with those runtime contracts.
3. Read-path rule: consumers should read commit completion from `COMMIT_RESULT`, state, command result facts, and git facts where applicable. They must not read done-package as a first-party completion signal.
4. Forbidden fallback: do not leave `DONE_PACKAGE` as an accepted active protocol type, do not keep `donePackagePath` in start/resume context or implementer prompts, do not preserve commit tests that seed or expect done-package as required runtime behavior, and do not rename done-package into another prose approval artifact.
5. Allowed resolution path: remove active `DONE_PACKAGE` protocol type support, preserve `COMMIT_RESULT` validation including explicit rejection of done-package fields, update live docs and runtime prompts, delete or retire dead done-package commit helper code, and update tests/fixtures to assert the no-done-package target.
6. Missing-data rule: missing `artifacts/done-package.md` is normal and must not be treated as an error by active commit/start guidance.
7. Phase boundary:
   - contract closure: owned here for active protocol message type removal and validation expectations.
   - producer closure: predecessor-owned by Phases 2, 4A, and 4B; do not reopen commit producer behavior except to delete dead helper code.
   - internal execution closure: owned here only for runtime-generated start/resume prompt/context surfaces that still name done-package.
   - workflow/orchestration closure: no lifecycle state-machine change is intended.
   - read-model closure: owned here for CLI/docs/test expectations that still expose done-package as live commit behavior.
   - activation closure: this task activates the final no-`DONE_PACKAGE` target state after all producers have moved to `COMMIT_RESULT`.
   - cleanup/recovery closure: owned here for live first-party cleanup only; archived historical docs remain historical.

### Plan Linkage

1. Parent plan gap closed: Phase 5, `done-package-live-reference-cleanup`.
2. Depends on:
   - Phase 2 `local-commit-done-package-removal`, archived at `plans/archive/tasks/local-commit-done-package-removal.md`.
   - Phase 4A `remote-commit-result-transport-cutover`, archived at `plans/archive/tasks/remote-commit-result-transport-cutover.md`.
   - Phase 4B `remote-commit-partial-success-readiness`, archived at `plans/archive/tasks/remote-commit-partial-success-readiness.md`.
3. Unlocks / impacts successors: completes the plan-level hard cutover so first-party runtime, protocol, docs, and tests no longer describe a mixed `COMMIT_RESULT` plus `DONE_PACKAGE` model.
4. Inherited exit expectation: active protocol validation no longer accepts `DONE_PACKAGE`, live docs describe `COMMIT_RESULT`, runtime-generated agent guidance no longer mentions done-package, and tests assert absence of done-package generation or emission.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md`: target architecture, Phase 5, hard cutover rule, and validation strategy.
   - `plans/archive/tasks/local-commit-done-package-removal.md`: local producer no-done-package behavior.
   - `plans/archive/tasks/remote-commit-result-transport-cutover.md`: normal started-remote `COMMIT_RESULT` transport behavior.
   - `plans/archive/tasks/remote-commit-partial-success-readiness.md`: partial-success same-authority remote import behavior.
   - `src/types/protocol.ts`: active protocol message type family.
   - `src/v11/shared/protocol/validators.ts`: envelope type acceptance and invalid-type diagnostics.
   - `src/v11/shared/protocol/protocolPayloadValidation.ts` and `src/v11/shared/protocol/protocolPayloadValidationHelpers.ts`: active protocol payload acceptance/rejection rules.
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.ts`: remote partial-success continuity import and legacy transcript-tail rejection behavior.
   - `src/v11/application/start/startCommandContext.ts`, `src/v11/application/start/startCommandImplementerPrompts.ts`, `src/v11/application/start/startCommandResumeImplementerPrompt.ts`, and `src/v11/application/start/startCommandTmuxLaunch.ts`: live runtime guidance surfaces.
2. Canonical elements:
   - `COMMIT_RESULT` remains the active commit completion transcript event.
   - `COMMIT_RESULT.metadata.commit_sha`, `metadata.commit_message`, and `metadata.staged_files` remain the technical commit facts.
   - `COMMIT_RESULT` continues to reject summary and done-package fields.
3. Guard elements:
   - Tests may keep done-package field names only as negative assertions for `COMMIT_RESULT`.
   - Remote import tests may keep `DONE_PACKAGE` only as a rejected legacy transcript tail.
   - Generic approval/convergence artifact-ref tests may keep `artifact://done-package.md` only when the test is about arbitrary refs and not commit completion authority.
4. Compat elements:
   - No active first-party `DONE_PACKAGE` compatibility remains after this task.
5. Closed terms:
   - `DONE_PACKAGE` means legacy removed protocol event, not a hidden fallback.
   - `done-package.md` means historical/legacy artifact, not a required live commit artifact.
6. Forbidden reinterpretations:
   - Do not treat docs-only references as harmless if they are live operator instructions.
   - Do not treat runtime prompt text as passive docs; it steers implementer behavior.
   - Do not remove negative tests that prove done-package fields or legacy `DONE_PACKAGE` tails are rejected.
7. Drift status: no known drift; current repo scan still shows live active references that this task must remove or reclassify.

### Scope Reality Proof

Current live scan shows the remaining active cleanup surface:

1. Protocol type family:
   - `src/types/protocol.ts` still includes `"DONE_PACKAGE"`.
2. Protocol validation entrypoint:
   - `src/v11/shared/protocol/validators.ts` accepts message types through `isProtocolMessageType` and reports invalid-type diagnostics from `protocolMessageTypes`.
   - This file may not need logic edits after `protocolMessageTypes` changes, but it is an implementation-significant acceptance boundary and must stay in the compile/test surface.
3. Remote continuity import legacy-tail rejection:
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.ts` still detects legacy `DONE_PACKAGE` transcript tails as a fail-closed condition.
   - After `DONE_PACKAGE` leaves `ProtocolMessageType`, this behavior must remain raw legacy-string detection or equivalent parser logic; it must not rely on `DONE_PACKAGE` being an active protocol type.
4. Runtime-generated prompt/context:
   - `src/v11/application/start/startCommandContext.ts` still exposes `donePackagePath`.
   - `src/v11/application/start/startCommandImplementerPrompts.ts` still tells implementers to keep a done package updated.
   - `src/v11/application/start/startCommandResumeImplementerPrompt.ts` still prints `Done package: ...`.
   - `src/v11/application/start/startCommandTmuxLaunch.ts` still passes `donePackagePath` into prompt builders.
5. Live docs:
   - `README.md` still contains active `DONE_PACKAGE` / `done-package.md` descriptions.
   - `docs/pairflow-initial-design.md` still lists `DONE_PACKAGE` and mandatory done-package behavior.
   - `docs/remote-bubble-execution.md` still names done-package as the default rollout smoke note location.
6. Commit helper residue:
   - `src/v11/application/commit/commitDonePackage.ts` still exports the retired read/create helper and may be removable if no live import remains.
7. Tests / fixtures:
   - `tests/cli/index.test.ts` still expects a remote commit success line with `DONE_PACKAGE`.
   - `tests/contracts/v11/commit.contract.runner.ts` still writes `done-package.md` for at least one commit contract case.
   - `tests/core/bubble/startBubble.test.ts` still asserts that the implementer launch command contains `artifacts/done-package.md`.
   - `tests/core/bubble/deleteBubble.test.ts` still contains a live remote transcript fixture with `type:"DONE_PACKAGE"` that is neither archived nor a negative rejection test.
   - `tests/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.test.ts` and `tests/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.test.ts` assert that legacy `DONE_PACKAGE` transcript tails remain rejected.
   - protocol tests need an explicit target-state assertion that `DONE_PACKAGE` is no longer a valid active message type while `COMMIT_RESULT` still rejects done-package fields.

## L1 - Implementation Contract

### Owned Changes

1. Remove `DONE_PACKAGE` from the active protocol message type family in `src/types/protocol.ts`.
2. Treat `src/v11/shared/protocol/validators.ts` as the active envelope acceptance entrypoint:
   - invalid type diagnostics must no longer list `DONE_PACKAGE`;
   - a `DONE_PACKAGE` envelope must fail before payload-specific validation;
   - `COMMIT_RESULT` diagnostics and validation must remain active.
3. Update protocol validation tests so:
   - a `DONE_PACKAGE` envelope is rejected as an inactive/unknown protocol message type;
   - valid `COMMIT_RESULT` still passes;
   - `COMMIT_RESULT` still rejects `summary`, `donePackagePath`, `donePackageContent`, and unknown metadata.
4. Preserve done-package field-name rejection helpers where they guard `COMMIT_RESULT`; do not remove those guard rails just because the legacy event type is removed.
5. Preserve remote continuity import legacy-tail rejection:
   - `sshBubbleCommitContinuityImportCommand.ts` may continue checking for raw `"DONE_PACKAGE"` transcript tail values as rejected legacy input;
   - it must not rely on `"DONE_PACKAGE"` being part of `ProtocolMessageType` or accepted envelope validation;
   - tests must prove the rejection still fires after active protocol removal.
6. Remove `donePackagePath` from start execution context and the fresh/resume implementer prompt builder inputs.
7. Rewrite fresh and resume implementer prompts so they direct agents toward lifecycle state, transcript entries, evidence, and pass/review artifacts as appropriate, without asking for a done-package.
8. Update tmux launch prompt construction to match the narrowed prompt inputs.
9. Delete or retire `src/v11/application/commit/commitDonePackage.ts` if it has no active imports. If retained only for tests or historical notes, document why in the task summary and keep it outside active runtime paths.
10. Update README and live architecture docs to describe:
   - `COMMIT_RESULT` as the commit completion event;
   - `artifacts/done-package.md` as removed/legacy only where historical migration context is necessary;
   - no mandatory done-package before approval or commit.
11. Update `docs/remote-bubble-execution.md` so rollout/smoke evidence uses a neutral evidence artifact or existing pass/review artifact reference instead of defaulting to done-package.
12. Update CLI and contract tests/fixtures that still expect live commit completion through `DONE_PACKAGE` or done-package files.
13. Classify remaining done-package search hits explicitly:
   - allowed negative tests for rejected legacy input;
   - allowed arbitrary artifact-ref tests unrelated to commit completion;
   - allowed archived historical docs under `plans/archive/**`;
   - disallowed live instruction, active protocol acceptance, active commit fixture, or runtime prompt dependency.

### Non-Goals

1. Do not change local or remote commit producer behavior beyond removing dead helper code and stale tests.
2. Do not introduce automatic crash recovery or a new prose commit artifact.
3. Do not rewrite archived historical task files.
4. Do not remove approval/convergence/reviewer tests merely because they use `artifact://done-package.md` as an arbitrary artifact reference.
5. Do not change merge partial-success import semantics; Phase 4B already owns that behavior.

### Branch / Contract Matrix

| Branch | Current residue | Required target | Tests |
| --- | --- | --- | --- |
| Active protocol message type | `DONE_PACKAGE` listed in `protocolMessageTypes` | `DONE_PACKAGE` removed; `COMMIT_RESULT` retained | protocol validator test rejects `DONE_PACKAGE` |
| Envelope validation entrypoint | `validators.ts` uses `isProtocolMessageType` and reports `protocolMessageTypes` | invalid-type diagnostics exclude `DONE_PACKAGE`; `COMMIT_RESULT` remains listed | protocol invalid-type diagnostic test |
| `COMMIT_RESULT` validation | rejects done-package fields | behavior preserved | existing field rejection tests remain |
| Remote continuity import legacy tail | import parser rejects legacy `DONE_PACKAGE` transcript tails | rejection preserved as raw legacy-string detection, not active protocol compatibility | SSH continuity import and remote commit legacy-tail tests |
| Fresh start prompt | names `donePackagePath` and says keep done package updated | no done-package instruction or input | start prompt/session tests assert absence |
| Resume start prompt | prints `Done package: ...` | no done-package instruction or input | resume/start tests assert absence |
| Tmux launch prompt inputs | passes `donePackagePath` | no done-package prompt input | compile/typecheck plus prompt tests |
| README/live docs | active `DONE_PACKAGE` and done-package artifact text | `COMMIT_RESULT` target-state docs | grep/manual review plus docs diff |
| Remote docs | default smoke note in done-package | neutral evidence artifact/pass reference | docs diff |
| CLI remote commit test | success output expects `DONE_PACKAGE` | success output expects `COMMIT_RESULT` or actual target envelope | CLI test |
| Contract runner | seeds done-package fixture | no done-package seed for active commit contract | contract test |
| Delete remote transcript fixture | live delete test fixture writes `type:"DONE_PACKAGE"` | fixture uses a valid non-`DONE_PACKAGE` message type or is explicitly converted into a negative legacy-rejection test if that is the intended behavior | delete bubble test |
| Generic artifact refs | may use `artifact://done-package.md` as arbitrary ref | allowed only if not commit completion behavior | explicit classification in summary |

### Shared Contract Compatibility

1. Contract changed: `ProtocolMessageType` / `protocolMessageTypes` active message family.
2. Change type: breaking contraction. `DONE_PACKAGE` is removed, not deprecated, and no first-party compatibility path remains.
3. Current first-party consumers that must align in this task:
   - `src/v11/shared/protocol/validators.ts`: envelope type acceptance and invalid-type diagnostics.
   - `src/v11/infrastructure/executor/ssh/sshBubbleStatusPayloadSupport.ts`: remote status payload message-type normalization; legacy `DONE_PACKAGE` must not be normalized as a valid active type.
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.ts`: partial-success import parser may keep raw legacy `DONE_PACKAGE` tail detection only as rejected input, not as an active `ProtocolMessageType`.
   - `src/v11/infrastructure/ui/presenters/timelinePresenter.ts`: UI timeline message-type acceptance; no target-state first-party timeline should depend on `DONE_PACKAGE`.
   - `src/index.ts`: public export surface for protocol types and validators must compile with the narrowed type family.
   - remote commit and continuity import tests may still construct `DONE_PACKAGE` as rejected legacy transcript data, but that use is negative-test input, not active protocol compatibility.
4. Alignment scope: all first-party compile/runtime consumers align now; no successor task owns protocol compatibility or migration.
5. External compatibility: out of scope. If external consumers appear later, create migration docs; do not re-add runtime compatibility here.

### Authority Boundary Map

1. Authority producer: predecessor-owned commit finalization producers write `COMMIT_RESULT`; this task does not reopen producer ordering or git commit behavior.
2. Stored authority: transcript `COMMIT_RESULT` plus bubble `DONE` state remain canonical.
3. Shared contract boundary: active protocol message type family and validator diagnostics.
4. In-scope consumers:
   - protocol validation tests and validation entrypoint;
   - start/resume runtime prompt/context builders;
   - CLI output tests and contract fixtures;
   - README and live architecture/operator docs;
   - first-party compile consumers of `ProtocolMessageType`.
5. Explicit out-of-scope consumers:
   - archived historical docs under `plans/archive/**`;
   - generic artifact-reference tests for approval/convergence/reviewer flows when the ref value is arbitrary and not commit authority;
   - remote legacy transcript negative-test fixtures may keep raw `DONE_PACKAGE` strings only to prove rejection.
6. Export surfaces: closed in this phase; `src/index.ts` must continue exporting the narrowed active protocol contract without `DONE_PACKAGE`.

### Error And Fallback Behavior

1. `DONE_PACKAGE` envelopes must not be accepted as active first-party protocol messages.
2. `COMMIT_RESULT` payloads containing done-package fields remain invalid with clear validation errors.
3. Missing `artifacts/done-package.md` must not produce start, commit, or contract fixture errors.
4. Any remaining remote legacy `DONE_PACKAGE` transcript tail should remain fail-closed in remote parser/import tests, not reintroduced as accepted protocol compatibility.

### Target-File Reality / Closure Budget

This is a final cleanup and activation task, not a producer task. It touches multiple consumer families, but those families share one bounded closure: removing the remaining live first-party references after every producer and partial-success repair path has already been cut over.

1. Authority producer: predecessor-owned; no producer behavior change is expected.
2. Persisted authority: `COMMIT_RESULT` transcript plus `DONE` state remain canonical.
3. Internal execution consumers: start/resume prompt/context cleanup is owned here.
4. Workflow orchestration consumers: no lifecycle state-machine change is owned here.
5. Read-model consumers: README, live docs, CLI output tests, and contract fixtures are owned here.
6. Cleanup/recovery consumers: only dead helper removal and stale docs/tests are owned here.

Keeping these closures together is acceptable because splitting would leave main in another mixed target state where active protocol, live docs, and runtime prompts disagree after all producer paths are already complete.

### Complexity Risk Triage

1. `risk_score`: 7.
2. `authority_risk`: 2, because the active protocol message family is contracted.
3. `surface_spread`: 2, because runtime prompts, docs, tests, and shared protocol exports are in scope.
4. `identity_join_risk`: 0, because no new identity join or remote authority matching is introduced.
5. `activation_coupling`: 1, because this activates the final no-`DONE_PACKAGE` target after producers are complete.
6. `prerequisite_risk`: 1, because this depends on completed Phase 2, Phase 4A, and Phase 4B producer/repair work.
7. `acceptance_multiplicity`: 1, because acceptance spans protocol, prompts, docs, tests, and grep classification.
8. Split decision: keep as one final cleanup/activation task. The score is high enough to require explicit plan linkage and consumer inventory, but not a mandatory split because producer closure is predecessor-owned and no new persisted authority or workflow mutation is introduced here.

### Bounded Task Shape

1. Primary shape: `activation_or_read_model`.
2. Secondary shape: `consumer_family_alignment`.
3. Cleanup aspect: dead helper/test/docs cleanup only; no fail-closed or coordination behavior is introduced.
4. Why the mix is safe: the only shared authority change is removal of a legacy type after all commit producers and remote repair paths already emit/import `COMMIT_RESULT`; consumer fallout is bounded to compile/runtime guidance, docs, tests, and active protocol acceptance.

### Baseline Preservation

1. `must_preserve_behaviors`:
   - local and remote commit producers continue to emit `COMMIT_RESULT`;
   - `COMMIT_RESULT` metadata remains `commit_sha`, `commit_message`, and `staged_files`;
   - `COMMIT_RESULT` rejects summary, unknown metadata, and done-package fields;
   - remote parsers/importers continue to fail closed on legacy `DONE_PACKAGE` transcript tails through raw legacy-string detection or equivalent logic, not active protocol compatibility.
2. `allowed_resolution_paths`:
   - remove active `DONE_PACKAGE` type support;
   - update compile consumers and tests to use `COMMIT_RESULT`;
   - retain done-package terminology only for negative tests, generic artifact refs, archived history, or explicit legacy notes.
3. `forbidden_regression_interpretations`:
   - do not relax `COMMIT_RESULT` validation to accept done-package fields;
   - do not convert removed `DONE_PACKAGE` into a hidden fallback or alias;
   - do not remove remote fail-closed legacy-tail tests merely because the type is no longer active.
4. `replacement_proof_required_if_removed`:
   - if deleting `commitDonePackage.ts`, prove no active imports remain and targeted commit tests still pass;
   - if removing a done-package fixture, prove the corresponding active setup now uses normal commit/worktree facts or no fixture at all.

### Precondition And Side-Effect Boundary

1. Runtime mutation preconditions: N/A; this task does not change commit, merge, start state mutation, git side effects, locks, or remote import ordering.
2. Side effects forbidden before validation: N/A for runtime behavior. Implementation must still avoid reintroducing generated done-package files in tests/fixtures.
3. Invalid/precondition failure behavior: `DONE_PACKAGE` envelope validation fails as inactive/unknown before payload-specific legacy handling can accept it.
4. Coordination primitives: N/A; no locks, leases, mutexes, retries, or serialization changes are in scope.

## L2 - Verification And Hardening

### Required Tests / Checks

1. Protocol:
   - `DONE_PACKAGE` envelope is rejected as inactive/unknown.
   - valid `COMMIT_RESULT` passes.
   - `COMMIT_RESULT` rejects done-package payload and metadata fields.
2. Start/runtime prompt:
   - fresh implementer startup prompt contains no `done-package`, `Done package`, or `donePackagePath`.
   - resume implementer startup prompt contains no `done-package`, `Done package`, or `donePackagePath`.
   - start context no longer exposes `donePackagePath`.
3. Remote legacy-tail preservation:
   - remote continuity import still rejects legacy `DONE_PACKAGE` transcript tails.
   - remote commit parser still rejects legacy `DONE_PACKAGE` transcript tails.
   - those tests treat `DONE_PACKAGE` as raw rejected legacy input, not an active protocol type.
4. CLI / contracts:
   - remote commit success expectation reports target `COMMIT_RESULT` behavior.
   - commit contract runner no longer creates done-package fixture as active setup.
5. Docs:
   - live README and active architecture docs no longer instruct operators or agents to create, review, or rely on done-package for commit completion.
   - remaining live occurrences are either deleted or explicitly marked legacy/historical and not active runtime guidance.
6. Regression search:
   - run a final `rg` for `done-package|donePackage|DONE_PACKAGE|done_package|Done package` over live paths, excluding `plans/archive/**`, and classify every remaining hit.

### Validation Commands

Run at minimum:

```bash
pnpm build
pnpm typecheck
pnpm vitest run tests/core/protocol/validators.test.ts tests/cli/bubbleCommitCommand.test.ts tests/cli/index.test.ts tests/contracts/v11/commit.contract.test.ts tests/core/bubble/startBubble.test.ts tests/core/bubble/deleteBubble.test.ts tests/v11/application/start/startCommandSession.test.ts tests/v11/application/start/startCommandRemoteExecution.test.ts tests/v11/application/start/startCommandOrchestration.test.ts tests/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.test.ts tests/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.test.ts
pnpm lint
pnpm test
```

If repository-wide `pnpm lint` or `pnpm test` still fail for known out-of-scope UI/watchdog issues, record the exact failures and include the targeted passing evidence above.

### Completion Criteria

1. Active protocol validation no longer accepts `DONE_PACKAGE`.
2. Runtime-generated agent guidance no longer tells implementers or resumptions to maintain a done-package.
3. Live docs describe `COMMIT_RESULT` as the commit completion model.
4. First-party tests/fixtures no longer expect done-package generation or `DONE_PACKAGE` emission as active behavior.
5. Remaining done-package search hits are either archived, negative rejection tests, or generic artifact-reference examples unrelated to commit completion.

### Hardening Backlog

1. Add a lightweight grep-based CI guard for live done-package commit-completion language if the repository already has a docs lint pattern.
2. Consider a later archived-doc index note explaining when historical done-package task docs became obsolete.
3. If downstream external consumers ever appear, create a separate migration note; do not reopen first-party runtime compatibility in this task.
