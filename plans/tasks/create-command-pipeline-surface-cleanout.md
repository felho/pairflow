---
artifact_type: task
artifact_id: task_create_command_pipeline_surface_cleanout_v1
title: "Create Command Pipeline Surface Cleanout"
status: approved
phase: phase1
target_files:
  - src/v11/application/create/createBubble.ts
  - src/v11/application/create/createCommandContract.ts
  - src/v11/application/create/createCommandRuntime.ts
  - src/v11/application/create/internal/runtime/createBubbleAgentsConfig.ts
  - src/v11/application/create/createCommandErrors.ts
  - src/v11/application/create/runCreateBubbleFlow.ts
  - src/v11/application/create/createBubbleFlowContext.ts
  - src/v11/application/create/createBubblePreparation.ts
  - src/v11/application/create/createBubblePersistence.ts
  - src/v11/application/create/createBubbleFinalization.ts
  - src/v11/application/create/createInitialTaskEnvelopeAppend.ts
  - src/v11/application/create/createRemoteAlias.ts
  - src/v11/application/create/createRepoDefaultsResolver.ts
  - src/v11/application/create/createReviewerFocus.ts
  - src/v11/application/create/createReviewerFocusFrontmatter.ts
  - src/v11/application/create/createTaskArtifacts.ts
  - src/v11/application/create/createValidationCommandsConfig.ts
  - src/v11/application/create/repoValidationProfileResolver.ts
  - src/v11/application/create/internal/runtime/**
  - src/v11/application/create/internal/preparation/**
  - src/v11/application/create/internal/persistence/**
  - src/v11/application/create/internal/finalization/**
  - tests/core/bubble/createBubble.test.ts
  - tests/core/bubble/createBubble.docContractGatesFailOpen.test.ts
  - tests/v11/application/create/**
  - tests/cli/createCommand.test.ts
  - tests/cli/createCliRunner.test.ts
  - tests/cli/createCliRunHelpers.test.ts
  - tests/helpers/bubble.ts
  - src/cli/commands/bubble/createCliRunHelpers.ts
  - src/cli/commands/bubble/createCliRunner.ts
  - src/cli/commands/bubble/createCliOptionValidation.ts
  - src/cli/commands/bubble/createCliOptionValidationHelpers.ts
  - src/index.ts
  - src/v11/defaults/create/createBubbleApi.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/architecture/v11-placement-and-extraction-governance.md
normative_refs:
  - docs/architecture/v11-architecture-overview.md
  - docs/architecture/v11-placement-and-extraction-governance.md
  - docs/architecture/v11-internal-module-boundaries.md
  - plans/archive/tasks/refactoring/list-remote-projection-pipeline.md
  - plans/archive/tasks/refactoring/merge-command-local-remote-execution-pipeline.md
owners:
  - "felho"
archive_group: refactoring
archive_path: plans/archive/tasks/refactoring/create-command-pipeline-surface-cleanout.md
---

# Task: Create Command Pipeline Surface Cleanout

## Current Codebase Check (2026-05-10)

1. `src/v11/application/create/**` currently has an explicit `internal/**`
   implementation layout, but every top-level file in the lane is a direct
   re-export camouflage wrapper over `internal/**`.
2. The current `internal_module_boundary` fitness report lists 17 report-only
   camouflage candidates under `src/v11/application/create/**`:
   - `createBubble.ts`
   - `createBubbleFinalization.ts`
   - `createBubbleFlowContext.ts`
   - `createBubblePersistence.ts`
   - `createBubblePreparation.ts`
   - `createCommandContract.ts`
   - `createCommandErrors.ts`
   - `createCommandRuntime.ts`
   - `createInitialTaskEnvelopeAppend.ts`
   - `createRemoteAlias.ts`
   - `createRepoDefaultsResolver.ts`
   - `createReviewerFocus.ts`
   - `createReviewerFocusFrontmatter.ts`
   - `createTaskArtifacts.ts`
   - `createValidationCommandsConfig.ts`
   - `repoValidationProfileResolver.ts`
   - `runCreateBubbleFlow.ts`
3. `src/v11/application/create/internal/runtime/createBubble.ts` is the current
   application entrypoint. It exports `createBubble(...)`, `BubbleCreateError`,
   and `extractReviewerFocus`, then delegates to `runCreateBubbleFlow(...)`.
   Current production use of `extractReviewerFocus` is internal to create
   preparation; external use is test coverage through the defaults/create
   re-export. It is not part of the first-principles create command API.
4. `src/v11/application/create/internal/runtime/runCreateBubbleFlow.ts`
   currently owns the visible create-command orchestration:
   - choose `createdAt`,
   - prepare context,
   - persist artifacts,
   - emit lifecycle event,
   - build `BubbleCreateResult`.
5. `src/v11/application/create/internal/runtime/createBubbleAgentsConfig.ts`
   is a current command-local runtime helper for deriving implementer,
   reviewer, meta-reviewer, and model config from create input plus defaults.
   It has no top-level wrapper today, but it is part of the create behavior
   that must remain hidden behind the command API unless a real public contract
   is intentionally named.
6. `src/v11/application/create/internal/preparation/createBubbleFlowContext.ts`
   owns much of the input authority and preparation path:
   - validate bubble id,
   - resolve review artifact type,
   - assert repo path is a git repo,
   - load repo config and resolve defaulted base branch/input,
   - ensure bubble does not exist,
   - resolve task or ideation placeholder,
   - resolve agent and model config through the command-local runtime helper,
   - extract reviewer focus and reviewer brief,
   - resolve remote execution pointer,
   - prepare bubble config input,
   - resolve validation profile commands,
   - build config and initial state.
7. `src/v11/application/create/internal/persistence/createBubblePersistence.ts`
   owns creation side effects:
   - create artifact/runtime directories,
   - write `bubble.toml`, state, transcript, inbox, task artifact,
   - write reviewer-focus artifact with fail-open status,
   - write doc-contract gate artifact where applicable,
   - write reviewer brief artifact,
   - write remote pointer when configured,
   - ensure runtime session file,
   - append initial TASK envelope for non-ideation creates.
8. `src/v11/application/create/internal/finalization/createBubbleFinalization.ts`
   owns result construction and create lifecycle event emission.
9. The current behavior is meaningful and heavily tested. This task must not
   change create semantics. The problem is architectural: callers and tests can
   still import a broad list of top-level helper names that simply mirror the
   internal file tree.
10. Current production import sites outside `src/v11/application/create/**` are
    in scope because they consume the old wrapper surface:
    - `src/cli/commands/bubble/createCliRunHelpers.ts` imports the defaulted
      `createBubble` plus create command contract types.
    - `src/cli/commands/bubble/createCliRunner.ts` imports create command
      contract types through a top-level wrapper.
    - `src/cli/commands/bubble/createCliOptionValidation.ts` imports create
      remote alias parsing through a top-level wrapper.
    - `src/cli/commands/bubble/createCliOptionValidationHelpers.ts` imports
      create command error helpers through a top-level wrapper.
    - `src/index.ts` exports create command public types through the current
      top-level contract wrapper.
    - `tests/helpers/bubble.ts` mirrors the same defaulted create import and
      public result type usage for tests.

## Classification

This is a Boundary/Architecture Refactor.

Classification triggers:

- touches `internal/**`,
- changes public export shape under `src/v11/application/create/**`,
- changes which tests import public surface versus internal helpers,
- replaces broad top-level wrapper surface with a narrower command-local
  interface.

Module depth is mandatory. The task must prove that callers know less after the
change and that top-level files no longer preserve a 1:1 map of internal
implementation modules.

## ReviewSpec Task-Mode Readiness Check (2026-05-10)

1. `review_result`: `approve_task`
2. `approval_evidence_ref`: manual CreatePairflowSpec ReviewSpec task-mode pass
   in bubble worktree
   `/Users/felho/dev/.pairflow-worktrees/pairflow/create-refactor-ideation`,
   target artifact
   `plans/tasks/create-command-pipeline-surface-cleanout.md`.
3. `execution_metadata_gate`: not applicable for this standalone architecture
   task because `plan_ref: null` and no parent plan tracker is claiming
   sequencing authority.
4. `target_file_reality_check`: matches the current codebase.
   - Every current top-level file under `src/v11/application/create/*.ts` is a
     direct `export * from "./internal/..."` wrapper.
   - `src/v11/application/create/internal/runtime/createBubble.ts` is the
     current application entrypoint.
   - `src/v11/application/create/internal/runtime/runCreateBubbleFlow.ts` owns
     create-command orchestration.
   - `src/v11/application/create/internal/preparation/**`,
     `src/v11/application/create/internal/persistence/**`, and
     `src/v11/application/create/internal/finalization/**` own the focused
     preparation, persistence, and finalization slices.
   - `src/v11/defaults/create/createBubbleApi.ts` imports through the current
     public wrapper surface and is correctly in scope.
5. `control_model_readiness`: ready. The task explicitly preserves
   validation-before-side-effect ordering, artifact persistence authority,
   reviewer-focus fail-open behavior, doc-gate best-effort behavior, and
   lifecycle event/result construction.
6. `closed_contract_drift`: no semantic drift authorized. Public create input,
   result, dependency, error, persisted artifact, remote pointer, doc-gate, and
   CLI meanings remain fixed.
7. `authority_fan_out`: acceptable for one bounded command-local refactor. The
   task touches one producer command family and treats CLI/defaults/tests as
   verification consumers, not new behavior owners.
8. `closure_budget`: acceptable. The task removes shallow create public surface
   and updates imports/tests without changing create behavior or opening
   start/kickoff/list/status/delete behavior.
9. `bounded_task_shape`: acceptable. The primary shape is command public-surface
   and workflow-orchestration cleanup. The task includes a no-transition rule
   and first-principles deletion rule, so compatibility aliases cannot preserve
   the old shallow module.
10. `contract_dense_gate`: satisfied by the Canonical Contract Matrix and the
    Mirrored Surface Checklist.
11. `capability_closure`: `end_to_end` for the existing `bubble create`
    activation path only. This task adds no new user capability.

## Complexity-Risk Triage

1. `risk_score`: 6.
2. `identity_join_risk`: 2.
   - Create joins bubble id, repo path, base branch, generated bubble instance
     id, worktree paths, task source, review artifact type, repo defaults,
     validation profile, optional remote alias, and optional reviewer brief.
3. `surface_spread`: 2.
   - Production scope is mostly `application/create`, with defaults and CLI
     tests as behavior-verification surfaces.
4. `activation_coupling`: 1.
   - Existing `bubble create` activation remains unchanged.
5. `prerequisite_risk`: 1.
   - Correctness depends on preserving validation-before-side-effect ordering
     and artifact creation semantics.
6. `split_decision`: single task accepted.
   - Rationale: this task is a behavior-preserving public-surface and pipeline
     cleanout. It must not redesign create inputs, persisted artifacts, repo
     defaults, reviewer-focus extraction, remote pointer schema, or CLI flags.
7. `authority_source_of_truth_note`: create result authority remains the
   existing `BubbleCreateResult` derived from the same prepared context,
   persisted artifacts, reviewer-focus write status, and lifecycle event path.

## Closure and Shape Triage

1. `primary_shape`: `workflow_orchestration_consumers`.
   - The bounded slice aligns the create command's public application surface
     behind one command-local interface.
2. `secondary_shape`: `internal_execution_consumers`.
   - Preparation, persistence, finalization, and result construction remain
     part of the create command success boundary.
3. `closure_buckets_touched`:
   - command public surface,
   - internal create pipeline vocabulary,
   - tests that import old wrapper helper paths,
   - fitness warning surface for internal re-export camouflage.
4. `collapsed_closures`: public-surface cleanup and pipeline vocabulary remain
   collapsed because retaining compatibility wrappers would preserve the
   shallow module problem this task exists to remove.
5. `deferred_closures`:
   - splitting reviewer-focus extraction into a separate shared/domain module,
   - redesigning repo validation profiles,
   - changing doc-contract gate artifact semantics,
   - changing remote create/start execution contracts,
   - broad cleanup of create consumers outside direct import updates.

## L0 - Policy

### Goal

Deepen the create command by replacing broad top-level re-export camouflage with
one deliberate command-local create interface and explicit internal ownership
for preparation, persistence, finalization, and support helpers.

The business question this task should make explicit is:

> Given a create command input, what is the single prepared-and-persisted bubble
> creation result, and which validation and artifact writes must complete before
> success is claimed?

Callers should not need to know the internal file layout for repo defaults,
remote alias parsing, reviewer-focus extraction, validation command config,
task artifact rendering, initial envelope append, artifact persistence, and
final result mapping just to call or test bubble creation.

### Context

`bubble create` is a state-changing lifecycle command. Its correctness depends
on strict ordering:

1. Validate input and resolve defaults before artifact writes.
2. Refuse invalid repo path, invalid bubble id, duplicate bubble path, invalid
   remote config, invalid review artifact type, and invalid task/reviewer brief
   input before creation side effects.
3. Build one prepared context from the resolved command.
4. Persist all required artifacts with current fail-open/fail-closed behavior.
5. Append initial TASK envelope only for non-ideation creates.
6. Emit the lifecycle event and return the canonical `BubbleCreateResult`.

The current code has useful internal pieces, but the public create module still
exposes nearly every internal helper through top-level wrapper files.

### Chosen Architecture Direction

1. Keep create workflow policy in `src/v11/application/create/**`.
2. Introduce or retain one narrow command-local public entrypoint for callers:
   `createBubble(...)` plus the public input/result/dependency/error/task-input
   contract.
3. Rename or reposition the old `runCreateBubbleFlow` orchestration into a
   pipeline vocabulary, for example `runCreateCommandPipeline(...)`, if that is
   the clearest route to remove old flow/helper surface.
4. Delete top-level wrapper files that only re-export `internal/**`, unless the
   file is part of the deliberate public contract.
5. Do not promote create-specific helpers into `shared/**`.
6. Preserve `BubbleCreateInput`, `BubbleCreateResult`,
   `BubbleCreateDependencies`, `ResolvedTaskInput`,
   `CreateBubbleImplementation`, `BubbleCreateError`, CLI behavior, persisted
   artifact formats, remote pointer schema, and lifecycle event semantics.
7. Apply a first-principles cleanup rule: do not keep code, files, exports,
   aliases, wrappers, or tests solely because they existed before. If a surface
   is not needed by the deliberate create command interface or by a justified
   internal owner, remove it in this task.
8. Remove `extractReviewerFocus` from the public create/defaults surface. If
   reviewer-focus extraction remains in create, it is an internal preparation
   owner with direct internal tests. If implementation proves a real multi-lane
   production caller, stop and route to task refinement instead of preserving a
   compatibility export.

### In Scope

1. Replace top-level re-export camouflage in `src/v11/application/create/**`
   with a deliberate public surface.
2. Keep or create a single public command entrypoint that defaults and CLI code
   can import without knowing internal structure.
3. Move production and tests away from old top-level helper imports when those
   helpers are not part of the public command contract.
4. If retaining any top-level file, make it an explicit contract/API file with
   local meaning, not `export * from "./internal/..."`.
5. Preserve create preparation semantics:
   - id validation,
   - review artifact type resolution,
   - repo path git validation,
   - repo default base-branch resolution,
   - duplicate bubble refusal,
   - task and ideation placeholder resolution,
   - implementer/reviewer/meta-reviewer and model defaulting,
   - reviewer focus and reviewer brief extraction,
   - remote alias/pointer resolution,
   - validation profile command resolution,
   - bubble config and initial state construction.
6. Preserve create persistence semantics:
   - all existing artifacts and directories,
   - `wx` overwrite refusal,
   - reviewer-focus artifact fail-open status,
   - doc-contract gate artifact best-effort write,
   - remote pointer write when configured,
   - initial TASK envelope append for non-ideation only.
7. Preserve create finalization semantics:
   - lifecycle event metadata,
   - `BubbleCreateResult` shape and field meaning.
8. Remove `extractReviewerFocus` from public create/defaults exports and move
   its tests to the exact retained owner.
9. Add focused application-level tests for the new create command pipeline or
   public interface where existing tests currently depend on old helper paths.
10. Add final evidence scans proving that old top-level wrapper imports are gone
   and that the `internal_module_boundary` create warning count drops.

### Out of Scope

1. Changing CLI flags, command names, defaults, help text, or user-visible
   create behavior.
2. Changing `BubbleCreateInput`, `BubbleCreateResult`,
   `BubbleCreateDependencies`, `ResolvedTaskInput`,
   `CreateBubbleImplementation`, or `BubbleCreateError` public meaning.
3. Changing persisted bubble artifact schemas or paths.
4. Changing remote pointer format or remote start behavior.
5. Changing reviewer-focus extraction behavior or reviewer brief semantics.
6. Changing doc-contract gate policy or artifact schema.
7. Changing repo validation profile semantics.
8. Broad cleanup of start/kickoff/list/status/delete consumers that only use
   the default `createBubble` entrypoint.
9. Retaining backwards-compatible import paths for old top-level helper
   wrappers that simply mirror internal implementation files.
10. Adding transitional, deprecated, compatibility, or migration-only aliases
    for removed create helper paths.
11. Preserving old tests whose only value is asserting implementation helper
    seams that should no longer exist.

### Control Model

1. `business_invariant`: `bubble create` must either produce one durable
   `BubbleCreateResult` backed by persisted bubble artifacts, or fail before
   claiming creation success.
2. `control_model`: create success is controlled by the prepared command
   context plus artifact persistence and lifecycle event/result construction.
   Reviewer-focus artifact write failure remains a degraded result field, not a
   command failure.
3. `read_path_rule`: create may read command input, repo config, global remote
   config when `remote` is requested, task/reviewer brief files, and git repo
   validation only through existing dependencies/ports.
4. `forbidden_fallback`: do not infer missing task, missing repo default base,
   missing remote config, missing required ports, invalid artifact type, or
   duplicate bubble path from secondary sources after validation fails.
5. `allowed_resolution_path`: repo defaults may resolve omitted base branch and
   validation commands exactly as today; ideation may resolve a placeholder task
   exactly as today.
6. `missing_data_rule`: missing required create input or dependency remains a
   create error before side effects, except current fail-open reviewer-focus and
   doc-gate artifact write behavior where explicitly preserved.
7. `phase_boundary`: this task owns internal command surface and orchestration
   closure only. It does not own new create capability, remote execution
   activation, or artifact schema redesign.

## Module Depth Check

1. Deletion test:
   - If the new public surface is deleted, callers should not have to recreate
     preparation, persistence, finalization, and result ordering from many
     helper imports; they should have one command-level seam to restore.
   - If deleting a retained top-level file only removes a pass-through export,
     that file is camouflage and should be deleted or rewritten as a real
     contract/API file.
2. Caller knowledge removed:
   - callers should no longer know the internal paths for preparation,
     persistence, finalization, repo default resolution, remote alias parsing,
     validation command config, task artifact rendering, or initial envelope
     append.
3. Public interface narrowed:
   - application-public create interface should be limited to the command
     entrypoint, `BubbleCreateInput`, `BubbleCreateResult`,
     `BubbleCreateDependencies`, `ResolvedTaskInput`,
     `CreateBubbleImplementation`, and `BubbleCreateError`.
   - package-root create surface is narrower and must preserve only current
     package-root create exports: value exports `createBubble` and
     `BubbleCreateError`, plus type exports `BubbleCreateInput`,
     `BubbleCreateResult`, and `ResolvedTaskInput`.
4. Policy moved behind the module:
   - validation-before-side-effect ordering, ideation/non-ideation envelope
     distinction, reviewer-focus write downgrade, doc-gate artifact handling,
     and lifecycle event/result construction stay behind the create command
     interface.
5. Test shape:
   - tests should exercise create behavior through the public command entrypoint
     or the new command-local pipeline seam, not through top-level wrappers over
     internal helpers.
   - reviewer-focus parsing tests are the explicit exception: after
     `extractReviewerFocus` is removed from public create/defaults exports,
     those parsing tests may target the retained internal owner directly, or a
     newly justified non-create owner after task refinement.
6. Existing public helpers:
   - every old top-level `export * from "./internal/..."` helper must be
     deleted or replaced by a deliberate public contract with local code. Do
     not keep a helper export solely because callers used the old path.
7. `extractReviewerFocus`:
   - it must not remain exported from `application/create/createBubble.ts` or
     `defaults/create/createBubbleApi.ts`;
   - tests for its parsing behavior may target the retained internal owner
     directly, or a newly justified non-create owner if implementation routes
     back to refine this task first.

Suggested acceptance criterion:

```md
AC: The create refactor must reduce caller knowledge, not only move or rename
files. If a top-level create file remains, it must be a deliberate API/contract
surface, not a 1:1 wrapper over `internal/**`.
```

## L1 - Change Contract

### Call-Site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Evidence |
|---|---|---|---|---|---|
| CS1 | `src/v11/application/create/createBubble.ts` | public create surface | Own the deliberate public entrypoint and only intentional public exports | P1 | T1,T2,T10 |
| CS2 | `src/v11/application/create/internal/runtime/createBubble.ts` or replacement | command API implementation | Preserve command input/result behavior while hiding internal helper layout | P1 | T2,T3,T8 |
| CS3 | `src/v11/application/create/internal/runtime/runCreateBubbleFlow.ts` or replacement | create pipeline | Own create orchestration through explicit pipeline vocabulary, not broad helper exports | P1 | T3-T7 |
| CS4 | `src/v11/application/create/internal/preparation/**` | preparation | Preserve validation/default/task/reviewer-focus/remote/config/state preparation | P1 | T3,T4 |
| CS5 | `src/v11/application/create/internal/persistence/**` | persistence | Preserve artifact writes, fail-open reviewer-focus status, doc-gate handling, remote pointer, initial envelope append | P1 | T5,T6 |
| CS6 | `src/v11/application/create/internal/finalization/**` | result/event finalization | Preserve lifecycle event metadata and `BubbleCreateResult` construction | P1 | T7,T8 |
| CS7 | `src/v11/defaults/create/createBubbleApi.ts` | default wiring | Import only the deliberate public create surface | P1 | T8,T10 |
| CS8 | CLI create tests and core create tests | public behavior proof | Preserve visible create behavior and result shape | P1 | T8,T9 |
| CS9 | `src/cli/commands/bubble/createCliRunHelpers.ts` | CLI create runner wiring | Use only the defaulted create entrypoint plus deliberate public contract types | P1 | T1,T8,T9 |
| CS10 | `src/cli/commands/bubble/createCliOptionValidation.ts` | CLI option validation | Keep CLI-only syntactic validation, including whitespace-only `--remote` rejection before `createBubble(...)`, in CLI ownership; stop importing the old top-level remote-alias wrapper and do not duplicate semantic remote config validation outside create preparation | P1 | T1,T4,T9 |
| CS11 | `src/cli/commands/bubble/createCliOptionValidationHelpers.ts` | CLI error mapping helpers | Keep CLI error formatting owned by CLI, importing only the deliberate public create error boundary/type when needed; do not import create internals or preserve the old top-level create-error wrapper | P1 | T1,T3,T9 |
| CS12 | `src/index.ts` | package public export surface | Export create command public types, including `ResolvedTaskInput`, from the deliberate contract/API owner, not the old wrapper path | P1 | T1,T2,T10,T12 |
| CS13 | `tests/helpers/bubble.ts` | shared test helper | Track the same deliberate create entrypoint and public result type shape as production callers | P2 | T1,T8 |
| CS14 | `src/cli/commands/bubble/createCliRunner.ts` | CLI create command runner | Use only deliberate public create command contract imports, not the old top-level contract wrapper | P1 | T1,T8,T9 |

### Canonical Contract Matrix

| Condition | Required Owner | Required Result | Forbidden Behavior | Required Evidence |
|---|---|---|---|---|
| invalid bubble id | public create command path | fail before side effects with existing create error semantics | artifact writes before validation | T3,T8 |
| missing or invalid repo path | preparation | fail before bubble artifact creation | fallback to cwd or unvalidated path | T3,T8 |
| invalid review artifact type | preparation | fail before bubble artifact creation with existing create error semantics | coerce unknown artifact type or write partial artifacts | T3,T8 |
| invalid task or reviewer brief input | preparation | fail before bubble artifact creation with existing create error semantics | create placeholder artifacts after invalid explicit input | T3,T5,T8 |
| omitted base branch with repo default | preparation | preserve current repo-default resolution | require explicit base when default exists | T4,T8 |
| omitted base branch without default | preparation | preserve current failure behavior | infer branch silently | T4,T8 |
| duplicate bubble path | preparation | fail before writes | overwrite or partially merge artifacts | T3,T8 |
| inline task or task-file create | preparation + persistence | preserve task artifact and initial TASK envelope | skip envelope for non-ideation create | T5,T8 |
| ideation create | preparation + persistence | preserve placeholder task artifact and no initial TASK envelope | append TASK before kickoff | T5,T8 |
| reviewer-focus artifact write fails | persistence | return degraded write status in `BubbleCreateResult` | fail command solely for this write | T6,T8 |
| doc-contract gate artifact write fails | persistence | preserve current best-effort behavior | change create success/failure semantics | T6,T8 |
| remote alias requested or remote config invalid | preparation + persistence | preserve remote config validation and remote pointer write; invalid remote config fails before bubble artifact creation | create remote pointer without validated remote config | T4,T5,T8 |
| agent or model override omitted/provided | preparation | preserve current agent/model defaulting and override mapping into bubble config | expose command-local agent config as public API solely for compatibility | T4,T4a,T8 |
| create succeeds | persistence + finalization | preserve lifecycle event metadata and `BubbleCreateResult` only after required artifact persistence succeeds | emit lifecycle event or return success before required artifacts are persisted | T7,T8 |

### Interface and Data Contract

The public create command meaning remains unchanged:

```ts
createBubble(
  input: BubbleCreateInput,
  dependencies?: BubbleCreateDependencies
): Promise<BubbleCreateResult>
```

The retained public create type surface includes:

```ts
type BubbleCreateInput;
type BubbleCreateResult;
type BubbleCreateDependencies;
type ResolvedTaskInput;
type CreateBubbleImplementation;
BubbleCreateError;
```

`CreateBubbleImplementation` remains part of the deliberate application-level
create contract because CLI runner wiring uses it for injected create
implementations. It must move with the deliberate create contract/API owner and
must not be recreated as a CLI-local duplicate or retained through an old
wrapper path.

Package-public create exports are narrower than application-public create
contract types. Preserve the current package-root create value exports:
`createBubble` and `BubbleCreateError`. Preserve the current package-public
create type exports: `BubbleCreateInput`, `BubbleCreateResult`, and
`ResolvedTaskInput`.
`ResolvedTaskInput` remains package-public because it is part of
`BubbleCreateResult` and is currently exported from the package surface.
Do not add `BubbleCreateDependencies` or `CreateBubbleImplementation` to the
package root unless a real package-public caller is proven; if such proof
appears, update this task before implementation instead of adding an accidental
package export.

CLI ownership rule:

1. CLI option validation may keep CLI-local parsing and user-facing validation
   for flags that must fail before `createBubble(...)` is invoked, including
   whitespace-only `--remote` rejection and its current error text/timing.
2. Create preparation remains the owner of semantic remote config validation,
   remote pointer derivation, and persisted remote pointer meaning.
3. CLI error formatting helpers may depend on the deliberate public
   `BubbleCreateError` boundary/type if needed, but must not import old
   top-level create-error wrappers or any `internal/**` create module.
4. Do not create a separate public remote-alias or create-error compatibility
   API solely to preserve old import paths.

Implementation may introduce a command-local pipeline seam such as:

```ts
runCreateCommandPipeline(input: {
  command: BubbleCreateInput;
  createdAt: Date;
  dependencies: BubbleCreateDependencies;
}): Promise<BubbleCreateResult>
```

The exact shape may differ, but the seam must be explicit and local to
`application/create`. It must hide preparation, persistence, finalization, and
support helper ordering from external callers.

### Ownership and Deferred Semantics

1. This task owns create command public-surface cleanup and internal pipeline
   ownership.
2. This task consumes existing config, state, reviewer, gate, remote, and
   transcript contracts but does not change their public meaning.
3. This task may move imports and tests to the new public/pipeline seams.
4. This task does not own start/kickoff lifecycle behavior after create.
5. Forbidden compatibility path: do not preserve old top-level helper wrappers
   only to avoid test import updates.
6. No-transition rule: this task should land directly in the intended final
   shape. Do not introduce temporary compatibility layers, deprecated exports,
   old-name aliases, barrel shims, or TODO-backed migration paths.
7. First-principles deletion rule: every retained create file/export must have
   a current owner and current caller. If the only reason to keep it is
   historical compatibility, delete it and update callers/tests to the intended
   seam.

### Mirrored Surface Checklist

When any row in the Canonical Contract Matrix changes, keep these sections
aligned:

1. L0 `In Scope`.
2. L0 `Control Model`.
3. L1 `Call-Site Matrix`.
4. L1 `Interface and Data Contract`.
5. L1 `Ownership and Deferred Semantics`.
6. L2 tests/evidence.
7. Acceptance criteria.

## L2 - Implementation and Verification Contract

### Implementation Steps

1. Run an import inventory:
   - `rg -n "application/create/(createBubble|createBubbleFinalization|createBubbleFlowContext|createBubblePersistence|createBubblePreparation|createCommandContract|createCommandErrors|createCommandRuntime|createInitialTaskEnvelopeAppend|createRemoteAlias|createRepoDefaultsResolver|createReviewerFocus|createReviewerFocusFrontmatter|createTaskArtifacts|createValidationCommandsConfig|repoValidationProfileResolver|runCreateBubbleFlow)" src tests`
   - Include production import sites outside the create lane in the update
     plan, especially `src/cli/commands/bubble/createCliRunHelpers.ts`,
     `src/cli/commands/bubble/createCliRunner.ts`,
     `src/cli/commands/bubble/createCliOptionValidation.ts`,
     `src/cli/commands/bubble/createCliOptionValidationHelpers.ts`, and
     `src/index.ts`.
2. Identify the deliberate public surface for `application/create`:
   - keep `createBubble(...)`,
   - keep public input/result/dependency/resolved-task/error types,
   - remove `extractReviewerFocus` from the public create/defaults exports.
3. Introduce or rename the internal create pipeline seam if needed.
4. Update defaults/CLI/core/tests to import the deliberate public surface or
   exact internal test seam.
5. Delete or rewrite top-level `export * from "./internal/..."` wrapper files.
   Do not replace them with renamed compatibility shims; either the file is a
   real public API/contract surface with local meaning, or it is removed.
   Also scan for and remove named re-export aliases, one-line import/export
   forwarding files, and thin compatibility modules that preserve removed old
   helper names without local ownership.
6. Preserve focused internal modules when they remain real owners:
   - runtime command-local helpers, including agent/model config derivation,
   - preparation,
   - persistence,
   - finalization,
   - runtime contract/error/default helpers.
7. Add focused tests for the new pipeline/public-surface import shape where the
   old wrapper imports were providing coverage.
8. Run final evidence scans:
   - no top-level create files contain only `export * from "./internal/..."`,
   - no named re-export aliases, one-line import/export forwarding files, or
     thin compatibility modules preserve removed old helper names,
   - no production/test imports depend on old helper wrapper files,
   - production import sites in `src/cli/commands/bubble/**` and `src/index.ts`
     no longer import removed wrapper paths,
   - `ResolvedTaskInput` remains exported from the deliberate create contract
     owner and package surface,
   - package-root value exports `createBubble` and `BubbleCreateError` remain
     available from `src/index.ts`,
   - `extractReviewerFocus` is not exported from the public create/defaults
     surface,
   - `pnpm fitness:report` output proves the create-specific
     `internal_reexport_camouflage_candidates` count drops to zero; a green
     `pnpm fitness:check:ci` alone is not sufficient for this report-only
     warning.
9. Re-evaluate architecture fitness drift:
   - This task changes public/internal module surface and should reduce an
     existing report-only warning.
   - A new fitness rule is not expected unless implementation discovers a new
     repeatable create-specific pattern that the generic internal-module
     boundary check cannot express.

### Required Tests and Evidence

| ID | Evidence | Purpose |
|---|---|---|
| T1 | Before/after import inventory for old create wrapper paths | Prove public/internal imports are intentional |
| T2 | Focused public surface scan for `export * from "./internal/..."` | Prove wrapper camouflage is removed |
| T3 | Focused create validation tests | Preserve invalid id/repo/artifact-type/task/reviewer-brief/duplicate/missing input failures |
| T4 | Repo defaults, validation profile, and remote alias tests | Preserve preparation decisions |
| T4a | Agent/model config default and override tests or existing equivalent coverage | Preserve create config derivation while keeping agent config helper internal |
| T5 | Create artifact persistence tests | Preserve task, transcript, state, config, remote pointer, and envelope writes |
| T6 | Reviewer-focus and doc-contract artifact failure tests | Preserve degraded/fail-open behavior |
| T7 | Lifecycle event/result ordering tests | Preserve result construction and emitted metadata, and prove lifecycle event/result success is constructed only after required artifact persistence succeeds |
| T8 | Existing core create suite | Preserve public create behavior |
| T9 | Existing CLI create suite | Preserve CLI activation and argument wiring |
| T10 | Public export scan for `extractReviewerFocus` | Prove reviewer-focus extraction no longer leaks through create/defaults public API |
| T11 | `pnpm fitness:report` evidence plus `pnpm fitness:check:ci` hard-fail evidence | Prove create warning count elimination and no hard-fail regression |
| T12 | Public create export scan for `ResolvedTaskInput`, `CreateBubbleImplementation`, and package-root create values/types | Prove `ResolvedTaskInput` remains exported from the deliberate contract/API owner and package surface; prove `CreateBubbleImplementation` remains application-public for CLI injection without becoming package-root public; prove package-root create exports preserve current values `createBubble`/`BubbleCreateError` and current types `BubbleCreateInput`/`BubbleCreateResult`/`ResolvedTaskInput`, without adding package-root create exports unless task-refined otherwise |

### Default Verification Commands

Run focused checks first:

1. `pnpm exec vitest run tests/v11/application/create tests/core/bubble/createBubble.test.ts tests/core/bubble/createBubble.docContractGatesFailOpen.test.ts`
2. `pnpm exec vitest run tests/cli/createCommand.test.ts tests/cli/createCliRunner.test.ts tests/cli/createCliRunHelpers.test.ts`
3. `pnpm fitness:report` for warning-count evidence and `pnpm fitness:check:ci`
   for hard-fail regression evidence

Before declaring direct source changes complete, run the repo default
verification order from `AGENTS.md` unless the implementation is owned by a
Pairflow bubble workflow with equivalent validation evidence:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. focused tests above
5. broader affected root test suite when needed
6. `pnpm test`
7. `pnpm build`

If any step is skipped, explain why in the implementation summary.

### Acceptance Criteria

1. The create lane exposes a deliberate public command surface instead of 17
   top-level `export * from "./internal/..."` wrappers.
2. No transitional/backward-compatibility aliases, deprecated wrappers, or
   migration-only barrels remain for removed create helper paths.
3. `createBubble(...)` remains the stable public create command entrypoint.
4. `BubbleCreateInput`, `BubbleCreateResult`, `BubbleCreateDependencies`,
   `ResolvedTaskInput`, `CreateBubbleImplementation`, and
   `BubbleCreateError` retain their application-public meaning.
5. Create preparation, persistence, finalization, and result semantics match the
   Canonical Contract Matrix.
6. Non-ideation create still appends the initial TASK envelope; ideation create
   still does not.
7. Reviewer-focus artifact write failure remains a degraded result status, not
   a create command failure.
8. Doc-contract gate artifact write behavior remains best-effort as today.
9. Tests exercise create behavior through the public command entrypoint or the
   new explicit command-local pipeline seam, not old wrapper files, except
   reviewer-focus parsing tests may target the retained internal owner after
   `extractReviewerFocus` is removed from public create/defaults exports.
10. Evidence scans show no production or test import depends on old broad create
   helper wrapper paths.
11. Evidence scans show no removed old-name create helper is retained as an
    alias or shim under another filename.
12. `ResolvedTaskInput` remains exported from the deliberate create contract
    owner and package public surface.
13. `CreateBubbleImplementation` remains exported from the deliberate
    application-level create contract/API owner for CLI injection, without
    retaining an old wrapper path or becoming a package-root export solely by
    accident.
14. Package-root create exports remain explicit: preserve current value exports
    `createBubble` and `BubbleCreateError`, and current type exports
    `BubbleCreateInput`, `BubbleCreateResult`, and `ResolvedTaskInput`; do not
    add `BubbleCreateDependencies` or `CreateBubbleImplementation` without
    task-level proof of a package-public caller.
15. Evidence scans show no named re-export alias, one-line import/export
    forwarding file, or thin compatibility module preserves removed old helper
    names.
16. `extractReviewerFocus` is not exported from public create/defaults API
    files.
17. Fitness drift is handled: `pnpm fitness:report` evidence shows the
    create-specific internal re-export camouflage warning count is eliminated,
    and `pnpm fitness:check:ci` remains green.

## Hardening Backlog

1. Consider a later repo-validation-profile boundary task if validation profile
   behavior grows beyond create and becomes truly shared.
2. Consider a later doc-contract artifact ownership task if create, pass, and
   status flows need a common public module for gate artifact projection.

## Parallelization Notes

1. This task may run in parallel with `approval` or `planWatch` surface cleanup
   only if file scopes remain disjoint.
2. Do not run in parallel with work that changes:
   - `src/v11/defaults/create/**`,
   - create CLI argument wiring,
   - repo defaults/config parsing,
   - doc-contract gate artifact semantics,
   - reviewer-focus extraction or reviewer guidance contracts.
3. If implementation discovers that public create input/result or persisted
   artifact contracts must change, stop and route to plan/task refinement before
   continuing.
