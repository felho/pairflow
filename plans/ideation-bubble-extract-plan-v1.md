---
artifact_type: plan
artifact_id: plan_ideation_bubble_extract_v1
plan_id: ideation-bubble-extract-plan-v1
created_on: "2026-05-04"
title: "Ideation Bubble Extract Plan"
status: approved
plan_status: approved
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-extract-command-contract
  - 2-extract-path-selection
  - 3-extract-copy-commit
  - 4-extract-docs-validation
active_task_id: 1-extract-command-contract
archive_group: 2026-05-04-ideation-bubble-extract-plan-v1
task_tracker:
  - task_id: 1-extract-command-contract
    task_path: plans/tasks/1-extract-command-contract.md
    status: in_progress
  - task_id: 2-extract-path-selection
    task_path: null
    status: not_created
  - task_id: 3-extract-copy-commit
    task_path: null
    status: not_created
  - task_id: 4-extract-docs-validation
    task_path: null
    status: not_created
---

# Plan: Ideation Bubble Extract

## Objective

Add an official Pairflow path for promoting selected artifacts from an ideation
bubble worktree into the main checkout without forcing the full bubble
approve/commit/merge lifecycle.

The operator use case is valid and distinct from a normal bubble merge:
ideation bubbles can protect `main` while an idea takes shape, but the desired
result may be only one or more selected planning/doc artifacts, not the whole
bubble branch.

## Done Definition

1. `pairflow bubble extract` exists as an explicit command for ideation artifact
   promotion.
2. The command accepts one or more explicit repeated `--path <repo-relative>`
   arguments and does not support glob expansion.
3. Extract resolves the target repository through `--repo <path>` when present,
   otherwise cwd ancestry lookup, then verifies the bubble metadata `repo_path`
   matches the resolved target repository before any file write.
4. Extract copies only the selected paths from the bubble worktree to the main
   checkout after validating path safety, the v1 allowed scope, target
   conflicts, and clean/on-`main` target worktree state.
5. Optional commit mode stages exactly the selected paths and commits them on
   `main` with a supplied message or a deterministic default.
6. Extract does not delete, close, approve, merge, run `bubble commit`, or
   otherwise mutate the source bubble lifecycle. Operators can use the existing
   bubble lifecycle commands separately after extraction.
7. Tests and docs cover the safe path, multi-path extraction, forbidden paths,
   target conflict behavior, staged-scope safety, and the explicit no-cleanup
   lifecycle boundary.

## Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| Operators can extract selected ideation artifacts into `main` without full bubble merge. | end_to_end | `pairflow bubble extract --id <id> [--repo <path>] --path <path> [--path <path>...] [--commit]` | CLI command, repo resolver, path validator, copy/commit runner, tests/docs. | Existing ideation bubble with selected artifact paths. | Planned across tasks 1-4; final task owns CLI docs and end-to-end command evidence. |

## Guiding Principles

1. Business invariant: only explicitly selected ideation artifacts move to
   `main`; unrelated bubble branch/worktree changes must not leak into the
   main checkout.
2. Control model: Pairflow bubble metadata decides whether the source bubble is
   eligible for extract; the explicit repeated `--path` list decides the only
   transferable files; the target checkout branch/state decides whether any
   write is allowed; git staged state decides commit scope.
3. Repository resolution rule: `bubble extract` resolves the target repository
   from `--repo <path>` when supplied, otherwise from cwd ancestry using the same
   operator-facing convention as other `bubble` commands. The resolved target
   repository must equal the bubble metadata `repo_path`; mismatch fails closed
   before path validation, file copy, staging, or commit.
4. Read-path rule: source content is read from the bubble worktree at the
   selected repo-relative paths; target content is written to the same
   repo-relative paths in the main checkout.
5. Forbidden fallback: do not infer paths from git status, transcript refs,
   agent prose, glob expansion, or "all changed files". Do not treat a normal
   implementation bubble as extract-eligible unless a future explicit override
   contract is created.
6. Allowed resolution path: v1 allows only explicit repo-relative file paths
   under `plans/**`, `docs/**`, or `progress/**`; selected paths must not be
   directories, absolute paths, contain `..`, or require shell/glob expansion.
   When a target path already exists on `main`, v1 fails closed; overwrite or
   replace behavior is deferred to a future contract. When the target checkout
   is not clean, not on `main`, detached, or in merge/rebase/cherry-pick state,
   fail closed before copying.
7. Commit authority rule: `extract --commit` is an operator-approved,
   selected-path-only commit path. Invoking `--commit` authorizes committing only
   the already-validated selected paths and does not alter the normal bubble
   `approve -> commit -> merge` lifecycle or its approval gate. Commit mode must
   produce/audit an explicit selected-path commit result including selected
   paths, staged paths, and commit SHA.
8. Missing-data rule: if the bubble worktree, bubble config, selected source
   path, or main checkout cannot be resolved exactly, extract must fail without
   writing or committing.
9. Sequencing / boundary note:
   - producer-first rule: command contract and eligibility rules must land
     before copy/commit implementation.
   - downstream consume families that remain separate: path validation, file
     transfer, git commit, docs/operator UX.
   - source lifecycle boundary: extract must leave the source bubble intact on
     both success and failure; deleting or closing the bubble remains a separate
     operator action through existing lifecycle commands.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/application/create/createCliOptions.ts`
   - `src/v11/domain/ideation/ideationMetadata.ts`
   - `docs/pairflow-initial-design.md`
   - existing `bubble delete`, `bubble status`, and `bubble commit` staged-scope
     safety patterns.
2. Closed canonical elements / terms:
   - `--ideation` creates persisted `[ideation] mode = true` metadata.
   - `ideation.task_pending` is kickoff state, not extract eligibility by
     itself.
   - Normal bubble merge remains the only path for full branch/worktree
     integration.
3. Explicitly authorized reinterpretation: none. `extract` adds a new
   ideation-only artifact promotion path; it does not change create/start/kickoff
   semantics or normal bubble `approve -> commit -> merge` semantics.
4. Downstream task impact: all tasks must preserve explicit path selection and
   must not broaden extract into a hidden merge operation.

## Current Status

### Completed Work

1. Pairflow already supports explicit ideation bubble creation with
   `pairflow bubble create --ideation`.
2. Ideation metadata is persisted in `bubble.toml` as `[ideation] mode = true`
   with `task_pending` tracking kickoff state.
3. Operators can manually copy selected files today, but that workflow is not
   Pairflow-native, not staged-scope guarded, and not auditable as a first-class
   lifecycle operation.

### Open Work

1. No official `bubble extract` / promote-artifact command exists.
2. No command contract exists for multi-path explicit artifact selection.
3. No guard enforces `plans/**`, `docs/**`, `progress/**` extraction scope.
4. No integrated copy/commit flow exists for this use case.

### Deferred / Future Work

1. Glob support is explicitly deferred and not part of this plan.
2. Extract from non-ideation implementation/code bubbles is deferred unless a
   future plan defines a stronger override and safety model.
3. Overwrite/replace of existing target files on `main` is deferred; v1 fails
   closed on target conflicts.
4. Interactive diff review UI is deferred; this plan may include dry-run output
   or conflict summaries only if it fits the bounded task scope.
5. Bubble deletion/cleanup integration is out of scope because Pairflow already
   has dedicated lifecycle commands for deleting bubbles.

## Progress / Phase Summary

1. Phase 1: command contract and CLI parse/help shape.
2. Phase 2: path eligibility and source/target validation.
3. Phase 3: copy and optional selected-path commit.
4. Phase 4: docs, tests, and lifecycle/operator integration polish.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-extract-command-contract` | `plans/tasks/1-extract-command-contract.md` | Define `pairflow bubble extract` CLI contract, option parser/help, result shape, ideation eligibility rules, `--repo`/cwd target repository resolution, repo mismatch fail-closed behavior, no-overwrite v1 contract, commit intent including optional message, and target checkout preconditions. | N/A | No official command contract exists. | in_progress |
| `2-extract-path-selection` | `null` | Implement explicit repeated `--path` validation with no glob support, repo-relative normalization, `plans/**`/`docs/**`/`progress/**` allowlist checks, source file existence checks, and target conflict detection. | `1-extract-command-contract` | No safe multi-path artifact selector exists. | not_created |
| `3-extract-copy-commit` | `null` | Copy selected files from bubble worktree to the clean `main` checkout and optionally stage/commit exactly those paths with an explicit selected-path commit result. | `2-extract-path-selection` | No official extract transfer/commit flow exists. | not_created |
| `4-extract-docs-validation` | `null` | Add operator docs, targeted tests, and final validation for success, multi-path, forbidden path, target conflict, repo mismatch, non-main/dirty target checkout, staged-scope, selected-path commit result, and source-bubble lifecycle non-mutation. | `3-extract-copy-commit` | Extract behavior would remain undocumented and regression-prone. | not_created |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| Official command surface is missing. | `1-extract-command-contract` | Contract must choose command name `bubble extract` and define option semantics. |
| Target repository/main checkout authority is ambiguous. | `1-extract-command-contract` | `--repo` wins when supplied; otherwise cwd ancestry lookup; resolved target must match bubble metadata `repo_path`. |
| Multiple explicit path selection is not modeled. | `2-extract-path-selection` | Repeated `--path` is canonical; glob support is forbidden; allowed scope is `plans/**`, `docs/**`, and `progress/**`. |
| Selected artifacts cannot be safely copied to main. | `3-extract-copy-commit` | Target checkout must be clean, on `main`, and not in merge/rebase/cherry-pick state before copy; target conflicts fail by default. |
| Optional commit can accidentally include unrelated files. | `3-extract-copy-commit`, `4-extract-docs-validation` | Staged list must exactly match selected paths before commit; result records selected paths, staged paths, and commit SHA. |
| Extract could accidentally become lifecycle cleanup. | `1-extract-command-contract`, `4-extract-docs-validation` | `bubble extract` must not delete, close, approve, merge, or run `bubble commit` on the source bubble; cleanup remains a separate existing lifecycle command. |
| Operator workflow is not discoverable. | `4-extract-docs-validation` | Update CLI help/docs and add tests that encode examples. |

## Dependencies and Order

1. `1-extract-command-contract` must run first because every later task depends
   on the command name, flags, eligibility rule, and result shape.
2. `2-extract-path-selection` must run before copy/commit because file transfer
   must consume an already-safe explicit path list.
3. `3-extract-copy-commit` owns transfer and selected-path commit result only;
   it must not mutate the source bubble lifecycle.
4. `4-extract-docs-validation` runs last to encode the final operator contract
   and regression tests after implementation details settle.

## Risks and Assumptions

1. Assumption: extract should be allowed for any bubble with persisted
   `ideation.mode=true`, regardless of whether `task_pending` is still true or
   kickoff has already set it false.
2. Risk: allowing overwrite by default could destroy main-side edits; v1
   explicitly has no overwrite/replace mode and must fail on existing target
   paths.
3. Risk: shell glob expansion can happen before Pairflow sees the arguments;
   docs and parser errors must make clear that each `--path` is an explicit
   repo-relative file path, not a pattern.
4. Risk: copying from a dirty or missing bubble worktree can hide partial
   ideation state; extract should validate source files directly and leave the
   bubble intact on failure.
5. Risk: operators may expect extract to clean up the source bubble; docs and
   help text must state that deletion/cleanup remains a separate lifecycle
   action through existing commands.
6. Risk: resolving the target repository differently from other bubble commands
   would create operator surprise; v1 must use `--repo` with cwd ancestry fallback
   and fail when the resolved repo disagrees with bubble metadata.

## Validation Strategy

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. Targeted CLI parser/help tests for `bubble extract`.
5. Targeted unit tests for path normalization, forbidden paths, repeated
   `--path`, no-glob behavior, `plans/**`/`docs/**`/`progress/**`
   allowed-scope checks, and target conflicts.
6. Targeted flow tests for copy-only, dirty/non-main target checkout rejection,
   repo mismatch rejection, commit mode staged-scope exactness, selected-path
   commit result shape, and source-bubble lifecycle non-mutation.
7. `pnpm test`
8. `pnpm build`
