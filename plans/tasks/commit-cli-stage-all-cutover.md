---
artifact_type: task
artifact_id: task_commit_cli_stage_all_cutover_v1
title: "Commit CLI Stage-All Cutover"
status: implementable
phase: phase3a
target_files:
  - "src/v11/application/commit/commitCommandContract.ts"
  - "src/v11/application/commit/commitCliCommand.ts"
  - "src/v11/application/commit/commitCommandApi.ts"
  - "src/v11/application/commit/commitCommandGitStep.ts"
  - "src/cli/index.ts"
  - "tests/cli/bubbleCommitCommand.test.ts"
  - "tests/cli/index.test.ts"
  - "tests/core/bubble/commitBubble.test.ts"
  - "tests/v11/application/commit/commitCommandApi.test.ts"
  - "tests/contracts/v11/commit.contract.runner.ts"
  - "tests/contracts/v11/cases/commit/*.case.json"
prd_ref: null
plan_ref: plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Commit CLI Stage-All Cutover

## Revision Log

1. `2026-04-25` (initial task): created after Phase 2 `local-commit-done-package-removal` was merged and archived.
2. `2026-04-25` (route-back refinement): narrowed from broad CLI/API/UI/router/remote activation to Phase 3A only. UI-router/frontend migration is successor task `commit-ui-stage-all-alignment`; remote command flag construction and remote result hard cutover stay in Phase 4.
3. `2026-04-25` (task review refinement): added the explicit remote-route adapter rule for `stageAll` normalization and changed root CLI success rendering from implementation change to preserve/verify scope.

## L0 - Policy

### Goal

Activate the new operator CLI flag `--stage-all` and application local commit input `stageAll` without forcing UI-router/frontend and remote SSH consumers to migrate in the same slice.

The behavior is the same bounded staging behavior already preserved by Phase 2: when enabled, Pairflow runs `git add -A` before validating staged files and committing. `stageAll` must not read, generate, require, or imply `artifacts/done-package.md`.

This is a CLI/application contract foundation and activation slice. It does not own UI-router HTTP/body migration, UI frontend/store/form payload migration, remote command construction, remote marker parsing, remote sync-back, protocol hard removal of `DONE_PACKAGE`, lifecycle/event metadata cleanup, or broad docs/prompt cleanup.

### Domain / Control Model Summary

1. Business invariant: a bubble commit is complete because Pairflow has valid git commit facts, appends the active route's commit completion transcript event, and reaches `DONE`; staging is only preparation for git commit.
2. Control model: `stageAll` controls whether Pairflow runs `git add -A` before staged-file validation.
3. Read-path rule: operator CLI help and parsing must expose `--stage-all`, not `--auto`.
4. Forbidden fallback: public CLI `--auto` must not remain as an alias.
5. Allowed resolution path: application input may temporarily accept legacy `auto` only as an internal compatibility field for not-yet-cut first-party consumers. That compatibility means staging only and cannot imply done-package generation.
6. Missing-data rule: if neither `stageAll` nor temporary internal `auto` is present, do not stage all.
7. Remote adapter rule: because `commitBubble` chooses local vs remote after reading the shared application input, Phase 3A may normalize `stageAll` once and pass that staging intent into the existing remote route's legacy `auto` port input. This is adapter compatibility only; the remote executor may still build `--auto` until Phase 4.
8. Phase boundary:
   - `shared_contract`: add `stageAll` to application commit input and prefer it for local commit.
   - `internal_execution_consumers`: pass the normalized staging boolean to the existing git step.
   - `read_model_consumers`: update direct CLI help, CLI parse, staging diagnostics, and preserve envelope-truthful CLI result rendering.
   - `workflow_orchestration_consumers`: limited to CLI command invocation; UI-router/frontend migration is Phase 3B.
   - `remote_transport`: deferred to Phase 4; only the application-level adapter may pass normalized staging intent into the existing remote `auto` port field.
   - `event_payload`: deferred; do not rename lifecycle metadata keys just because they contain `auto`.

### Plan Linkage

1. Parent plan gap closed: Phase 3A, `commit-cli-stage-all-cutover`.
2. Depends on:
   - Phase 1 `COMMIT_RESULT` protocol validation.
   - Phase 2 local commit producer cutover and `donePackagePath` result removal.
3. Unlocks:
   - `commit-ui-stage-all-alignment`: UI-router/frontend can move from temporary `auto` compatibility to `stageAll`.
   - `remote-commit-result-alignment`: remote transport can later use `--stage-all` while removing `DONE_PACKAGE` continuity.
4. This task is not the hard cutover. Main is complete only after Phase 3B, Phase 4, and Phase 5 converge.

### Canonical Contract Anchors

1. Source anchors:
   - `src/v11/application/commit/commitCommandContract.ts`: application commit request/result contract.
   - `src/v11/application/commit/commitCliCommand.ts`: operator CLI parse/help surface.
   - `src/v11/application/commit/commitCommandApi.ts`: route selection and local staging flag normalization.
   - `src/v11/application/commit/commitCommandGitStep.ts`: local `git add -A` behavior and staged-files diagnostics.
   - `src/cli/index.ts`: root CLI success rendering.
   - `tests/contracts/v11/commit.contract.runner.ts` and `tests/contracts/v11/cases/commit/*.case.json`: contract cases that directly exercise application commit input.
2. Canonical elements:
   - `stageAll`: boolean application input meaning "stage all current worktree changes before commit".
   - `--stage-all`: public CLI spelling for the same behavior.
   - `COMMIT_RESULT` metadata remains `commit_sha`, `commit_message`, and `staged_files`.
3. Compat elements:
   - `auto`: temporary internal application input compatibility for not-yet-cut first-party UI/router or remote consumers only.
   - remote `auto` port input: temporary adapter target for normalized `stageAll` while remote SSH command construction remains Phase 4-owned.
   - `DONE_PACKAGE`: temporary remote continuity only; this task must not hard-cut remote result handling.
4. Forbidden reinterpretations:
   - do not make `stageAll` mean "generate done-package";
   - do not preserve public CLI `--auto`;
   - do not reintroduce `donePackagePath`;
   - do not alter remote SSH command construction, remote marker parsing, or sync-back;
   - do not rename unrelated `auto` concepts such as attach-launcher or meta-review auto behavior.

### Scope Reality / Shape Proof

1. Inspected entrypoints:
   - `BubbleCommitCommandOptions.auto` and `--auto` parsing/help in `commitCliCommand.ts`.
   - `CommitBubbleInput.auto?: boolean` in `commitCommandContract.ts`.
   - `const auto = input.auto ?? false` and local/remote route propagation in `commitCommandApi.ts`; Phase 3A must replace this with explicit staging normalization that prefers `stageAll` and can adapt to remote legacy `auto`.
   - `runCommitGitStep({ auto })` and `--auto` diagnostics in `commitCommandGitStep.ts`.
   - root CLI success text in `src/cli/index.ts`.
   - direct commit contract fixtures/runners that send the staging field.
2. Actual touched scope: CLI/application staging input activation, direct local staging diagnostics, remote route adapter pass-through for the already-normalized staging boolean, and root CLI result rendering verification.
3. Mutation boundary: the task does not change commit authority, transcript payload shape, state transition order, clone retry, source-branch sync, or crash recovery.
4. Hidden scope ruled out:
   - UI-router HTTP/action dispatch and UI frontend/store/form migration,
   - remote port type rename and SSH command construction,
   - remote output parser/sync-back,
   - protocol hard removal of `DONE_PACKAGE`,
   - lifecycle/event metadata key cleanup,
   - prompt/docs cleanup.
5. Bounded-task shape: primary `activation_or_read_model`; secondary `consumer_family_alignment` for the CLI/application consumer family only. The split is safe because UI remains behind explicit temporary compatibility until Phase 3B, and remote is touched only by a pass-through adapter into the existing legacy remote `auto` port until Phase 4.

### Authority Boundary Map

1. `authority_producer`: predecessor-owned by Phase 2; local commit still produces `COMMIT_RESULT`.
2. `persisted_authority`: unchanged; transcript/state authority is not altered.
3. `internal_execution_consumers`: in scope for staging boolean normalization into local `git add -A` and remote legacy `auto` adapter pass-through.
4. `workflow_orchestration_consumers`: in scope only for direct CLI command invocation.
5. `read_model_consumers`: in scope for CLI help, staging diagnostics, and envelope-truthful CLI success output.
6. `cleanup_recovery_consumers`: out of scope.

### Baseline Preservation

1. Must preserve:
   - state must be `APPROVED_FOR_COMMIT` before commit side effects;
   - no staged files still fails with `COMMIT_STAGED_FILES_EMPTY` unless existing deterministic clone retry/reuse applies;
   - default commit message remains `bubble(<bubbleId>): finalize`;
   - `--message` and `--ref` behavior remain unchanged;
   - `stageAll: true` / `--stage-all` performs the same `git add -A` as the temporary `auto: true` path;
   - local result shape remains Phase 2 technical facts without `donePackagePath`;
   - remote `DONE_PACKAGE` continuity remains untouched.
   - remote staging intent remains preserved by passing normalized stage-all intent into the existing remote `auto` adapter until Phase 4.
2. Intentionally replaced:
   - public CLI `--auto`;
   - primary application input spelling for local commit from `auto` to `stageAll`;
   - CLI/help/diagnostic wording that says `--auto` or implies done-package generation.
3. Temporary preserved:
   - application `auto` compatibility may remain for successor consumers, but must be marked compatibility and cannot be the preferred local CLI/application path.

### Precondition and Side-Effect Boundary

1. Preconditions before commit side effects:
   - resolve bubble and identity;
   - state is `APPROVED_FOR_COMMIT`;
   - staged files exist after optional stage-all, or existing deterministic clone-head reuse applies.
2. Side effects forbidden before preconditions pass:
   - no transcript append;
   - no state write;
   - no git commit.
3. Side effects unchanged:
   - optional `git add -A`;
   - git commit;
   - transcript append;
   - state transition.

### In Scope

1. Add `stageAll?: boolean` to application commit input.
2. Normalize staging input so `stageAll` is preferred; temporary `auto` remains compatibility only where needed for not-yet-cut consumers.
3. For remote-route execution during Phase 3A, pass the normalized `stageAll` intent into the existing remote route's legacy `auto` port input without changing remote port types, SSH command construction, marker parsing, sync-back, or result continuity.
4. Replace CLI `--auto` with `--stage-all`.
5. Ensure CLI `--auto` fails clearly and points operators to `--stage-all`.
6. Update CLI help to remove done-package requirement/generation language.
7. Update local staging diagnostics to mention `--stage-all`, not `--auto`.
8. Update direct CLI/application/local commit tests.
9. Preserve and verify root CLI success rendering so it reports the actual returned envelope type and does not hardcode `COMMIT_RESULT` over a remote legacy `DONE_PACKAGE` result.
10. Update commit contract runner/cases where they directly send application commit staging input.

### Out of Scope

1. UI-router `UiCommitBubbleInput` rename.
2. UI HTTP body `auto` rejection.
3. UI client/store/action/form payload or label migration.
4. Remote commit port input rename.
5. Remote SSH command construction from `--auto` to `--stage-all`.
6. Remote SSH output parsing from `DONE_PACKAGE` to `COMMIT_RESULT`.
7. Remote sync-back removal of `done-package.md`.
8. Protocol hard removal of `DONE_PACKAGE`.
9. Lifecycle/event metadata key cleanup.
10. Broad README/docs/start/resume prompt cleanup.

### Safety Defaults

1. If `stageAll` is absent and no explicit temporary compatibility `auto` is present, do not stage all.
2. If public CLI `--auto` is used, fail clearly.
3. If remote route receives `stageAll`, preserve that staging intent through the existing remote `auto` adapter until Phase 4.
4. If implementation discovers UI/router or remote compile fallout that cannot be handled with the narrow adapter described above, stop and route to Phase 3B or Phase 4 rather than expanding this task.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes, with Plan -> Task coverage, because the scope is limited to CLI/application activation and explicitly defers UI/router and remote consumer-family alignment.`
9. Closure buckets touched:
   - `shared_contract`,
   - `internal_execution_consumers`,
   - `read_model_consumers`.
10. Explicitly deferred closures:
   - UI/router/frontend consumer-family alignment,
   - remote transport/result alignment,
   - lifecycle/event payload cleanup,
   - cleanup/recovery.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Commit staging is not commit authority. | Rename CLI/application staging control only. | P1 | required-now |
| Control model | `stageAll` controls `git add -A`. | Normalize to one local staging boolean before the git step. | P1 | required-now |
| Public CLI rule | Operators use `--stage-all`. | `--auto` is rejected, not aliased. | P1 | required-now |
| Compat rule | Application `auto` may remain internal compatibility. | Mark as temporary and never expose it as preferred local input. | P2 | required-now |
| Remote adapter rule | `stageAll` remote intent is preserved through existing remote `auto` adapter. | Normalize once in application input; do not rename remote port or SSH flag here. | P1 | required-now |
| Remote boundary | Remote transport is Phase 4. | Do not change SSH command construction, sync-back, or remote parser. | P1 | required-now |
| UI boundary | UI/router migration is Phase 3B. | Do not change UI HTTP/body/frontend payloads here. | P1 | required-now |

### 1) Call-Site Matrix

| ID | File | Function / Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/commit/commitCommandContract.ts` | `CommitBubbleInput` | add `stageAll?: boolean`; keep any `auto?: boolean` only as documented temporary compatibility | P1 | required-now | typecheck |
| CS2 | `src/v11/application/commit/commitCliCommand.ts` | parse/help/run command | parse `--stage-all`; reject `--auto`; help has no done-package language | P1 | required-now | CLI tests |
| CS3 | `src/v11/application/commit/commitCommandApi.ts` | shared `commitBubble` local/remote route selector | prefer `stageAll`; fallback to temporary `auto` only for internal compatibility; local route receives normalized staging boolean; remote route receives the same boolean through existing legacy `auto` adapter; do not change remote construction | P1 | required-now | API tests |
| CS4 | `src/v11/application/commit/commitCommandGitStep.ts` | `runCommitGitStep` | accept normalized staging boolean / `stageAll` naming; diagnostics mention `--stage-all` | P1 | required-now | local commit tests |
| CS5 | `src/cli/index.ts` | commit result rendering | preserve existing actual-envelope rendering; local may show `COMMIT_RESULT`, remote may still show `DONE_PACKAGE` until Phase 4 | P2 | verify-now | root CLI tests |
| CS6 | contract/commit test harnesses | commit case input | update direct application staging input cases to use `stageAll` where this task owns the caller | P2 | required-now | contract tests |

### 2) Data And Interface Contract

| Contract | Current | Target In This Task | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| CLI flag | `--auto` | `--stage-all` | breaking public CLI change; no alias | P1 | required-now |
| Application input | `auto?: boolean` | `stageAll?: boolean` preferred | temporary internal `auto` compatibility only | P1 | required-now |
| UI HTTP body | `auto` | unchanged in this task | Phase 3B owns migration/rejection | P1 | successor |
| Remote route adapter | application route passes `auto` to remote port | normalized `stageAll` may be passed into existing remote `auto` port input | temporary adapter only; no remote type/SSH rename | P1 | required-now |
| Remote command | emits `--auto` | unchanged in this task | Phase 4 owns remote command construction | P1 | successor |
| Result object | technical commit facts, no `donePackagePath` | unchanged | preserve Phase 2 | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Git | `stageAll=true` runs `git add -A` before staged-file validation | staging when absent/false | same behavior as prior `auto` path | P1 | required-now |
| Transcript | existing local `COMMIT_RESULT` append | payload shape change | Phase 2 contract remains closed | P1 | required-now |
| State | existing transition ordering | state writes before valid commit facts | unchanged | P1 | required-now |
| CLI parse | reject `--auto` | hidden alias/fallback | clear replacement message required | P1 | required-now |
| Remote adapter | pass normalized stage-all intent to existing remote `auto` input | remote command construction/parser/sync-back changes | preserves staging intent without Phase 4 cutover | P1 | required-now |

### 4) Error And Fallback Contract

| Trigger | Behavior | Reason / Message Rule | Priority | Timing |
|---|---|---|---|---|
| CLI uses `--auto` | fail parse clearly | mention `--stage-all` replacement | P1 | required-now |
| `stageAll` is absent | do not stage all unless temporary internal `auto` compatibility is explicitly present | preserve default no-stage behavior | P1 | required-now |
| no staged files and stage-all false | preserve `COMMIT_STAGED_FILES_EMPTY` | message suggests `--stage-all` | P1 | required-now |
| no staged files after stage-all true | preserve fail-closed error | message names `--stage-all` | P1 | required-now |
| remote bubble with `stageAll=true` before Phase 4 | preserve staging intent through remote `auto` adapter | SSH may still build `--auto`; no `--stage-all` remote construction yet | P1 | required-now |
| UI/router change needed | stop or route to Phase 3B | do not silently broaden task | P1 | required-now |
| remote construction change needed | stop or route to Phase 4 | do not silently broaden task | P1 | required-now |

### 5) Test Matrix

| ID | Scenario | Setup | Expected Result | Priority | Timing |
|---|---|---|---|---|---|
| T1 | CLI parses `--stage-all`. | `pairflow bubble commit --id b --stage-all --ref x`. | parsed local input uses `stageAll=true`; no public `auto` option. | P1 | required-now |
| T2 | CLI rejects `--auto`. | `parseBubbleCommitCommandOptions([\"--id\",\"b\",\"--auto\"])`. | clear parse/error path; no alias behavior. | P1 | required-now |
| T3 | CLI help has no done-package/`--auto` language. | `getBubbleCommitHelpText()`. | contains `--stage-all`; does not contain `--auto`, `done-package`, or auto-generation text. | P1 | required-now |
| T4 | Local stage-all commit succeeds. | approved local bubble with unstaged file and `stageAll: true`. | state `DONE`, file committed, `COMMIT_RESULT`, no done-package generated. | P1 | required-now |
| T5 | No staged files without stage-all fails. | approved local bubble, no staged files, no `stageAll`. | `COMMIT_STAGED_FILES_EMPTY`; message suggests `--stage-all`. | P1 | required-now |
| T6 | Temporary application `auto` compatibility remains staging-only if retained. | direct internal `commitBubble({ auto: true })` compatibility case. | stages all but does not read/generate done-package; marked for successor removal. | P2 | required-now-if-retained |
| T7 | Remote `stageAll` intent uses adapter without SSH cutover. | remote route test with `stageAll: true` and mocked remote command. | existing remote command dependency receives `auto: true`; remote result continuity remains unchanged. | P1 | required-now |
| T8 | Root CLI success rendering is envelope-truthful. | existing local and remote render tests. | preserve actual-envelope rendering; remote legacy result still shows `DONE_PACKAGE` until Phase 4. | P2 | verify-now |
| T9 | Contract corpus direct commit input uses `stageAll`. | v11 commit contract case owned by CLI/application path. | runner sends `stageAll` and still proves commit result invariant. | P2 | required-now |

### 6) Shared Contract Compatibility

| Shared Contract | Current Consumers | Additive vs Breaking | Required Alignment | Out-of-Scope Consumers |
|---|---|---|---|---|
| `CommitBubbleInput` | CLI command, direct tests, UI router, remote path | additive/preferred in this task | CLI/application prefer `stageAll`; `auto` remains temporary compatibility only if needed; remote receives normalized staging intent through legacy `auto` adapter | UI/router Phase 3B, remote hard cutover Phase 4 |
| CLI options | operator CLI and CLI tests | breaking | `--stage-all` only; `--auto` rejected | none |
| UI/router input | UI HTTP/action dispatch | unchanged | N/A | Phase 3B |
| remote command input | remote executor/SSH command | unchanged | N/A | Phase 4 |

### 7) Closure-Budget Summary

| Item | Value |
|---|---|
| Closure buckets touched | `shared_contract`, `internal_execution_consumers`, `read_model_consumers` |
| Intentionally collapsed closures | CLI/application request activation and direct local staging diagnostics |
| Explicitly deferred closures | UI/router/frontend alignment, remote transport/result alignment, protocol hard removal, prompt/docs cleanup, cleanup/recovery |
| Safe bounded proof | the task activates one staging control for the CLI/application path while preserving explicit temporary compatibility for not-yet-cut consumers. Remote route involvement is limited to passing the normalized boolean into the existing legacy `auto` adapter. It does not alter commit authority, persisted transcript payload, state transition, UI public HTTP body, remote SSH command construction, or remote transport continuity. |

## L2 - Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Remove temporary application `auto` compatibility after UI and remote consumers are cut over. | L2 | P1 | successor | route-back review | Phase 3B narrows UI use; Phase 4 removes remote dependency. |
| HB2 | Add operator release-note wording for `--auto` removal. | L2 | P3 | later-docs | task drafting | Defer to live docs cleanup. |
| HB3 | Remove remote done-package continuity and remote SSH markers. | L2 | P1 | successor | parent Phase 4 | Implement in `remote-commit-result-alignment`. |

## Assumptions

1. Phase 2 local commit producer cutover remains merged and authoritative.
2. `stageAll` is the final first-party request field name for automatic staging.
3. Temporary application `auto` compatibility is acceptable only to keep successor UI/router and remote tasks file-disjoint and bounded.
4. Remote bubbles do not need public `--auto` compatibility, but remote staging intent from `stageAll` must be preserved through the existing remote `auto` adapter until Phase 4.
5. Root CLI success rendering already reports `result.envelope.type`; this task verifies/preserves that behavior rather than requiring a rendering rewrite if the current implementation already satisfies it.

## Spec Lock

Task state is `IMPLEMENTABLE` because:

1. The parent plan now defines Phase 3A as CLI/application stage-all foundation, not full UI/router/remote cutover.
2. The target files and call-sites are limited to the CLI/application consumer family and direct contract fixtures.
3. UI-router/frontend migration and remote command construction are successor-owned.
4. The test matrix proves public CLI activation, local staging behavior, remote adapter preservation, no done-package regression, and envelope-truthful CLI rendering.

This task must be downgraded to `draft` or routed back to the parent plan if implementation requires changing UI-router HTTP/body payloads, UI frontend/store/form behavior, remote SSH command construction, remote sync-back, protocol `DONE_PACKAGE` validation, or lifecycle/event metadata keys.

## Open Questions

No blocking open questions.
