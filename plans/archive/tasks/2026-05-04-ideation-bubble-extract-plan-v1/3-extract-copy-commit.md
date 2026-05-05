---
artifact_type: task
artifact_id: task_extract_copy_commit_v1
task_family_id: extract-copy-commit
sequence_key: "3"
task_id: 3-extract-copy-commit
title: "Extract Copy And Commit"
status: archived
phase: phase3
target_files:
  - src/v11/application/extract/extractCommandContract.ts
  - src/v11/application/extract/extractPathSelection.ts
  - src/v11/application/extract/extractTransfer.ts
  - src/v11/application/extract/emitExtractV11.ts
  - src/v11/application/extract/extractCliCommand.ts
  - src/v11/defaults/extract/extractCommandDefaults.ts
  - tests/cli/bubbleExtractCommand.test.ts
  - tests/cli/index.test.ts
prd_ref: null
plan_ref: plans/ideation-bubble-extract-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/ideation-bubble-extract-plan-v1.md
  - plans/archive/tasks/2026-05-04-ideation-bubble-extract-plan-v1/1-extract-command-contract.md
  - plans/archive/tasks/2026-05-04-ideation-bubble-extract-plan-v1/2-extract-path-selection.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 3-extract-copy-commit-doc
impl_bubble_id: 3-extract-copy-commit-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-04-ideation-bubble-extract-plan-v1
archive_path: plans/archive/tasks/2026-05-04-ideation-bubble-extract-plan-v1/3-extract-copy-commit.md
---

# Task: Extract Copy And Commit

## L0 - Policy

### Goal

Implement the transfer phase for `pairflow bubble extract`: copy the already
validated selected files from an ideation bubble worktree into the clean `main`
checkout, and optionally stage and commit exactly those selected target paths.

### Domain / Control Model Summary

1. Business invariant: only explicitly selected ideation artifacts may move from
   the bubble worktree to `main`; unrelated bubble worktree changes, unrelated
   target checkout changes, and normal bubble lifecycle state must not leak into
   the extract result.
2. Control model: task 1 preconditions decide source-bubble eligibility and
   target checkout readiness; task 2 selected-path validation decides the exact
   transferable file set; this task owns file copy, optional selected-path git
   staging, optional selected-path commit, and the final extract result.
3. Read-path rule: source content may be read only from each
   `selectedPaths[].sourcePath` produced by `validateExtractPathSelection`; target
   writes may go only to the matching `selectedPaths[].targetPath`.
4. Forbidden fallback: do not infer paths from git status, changed-file lists,
   transcript/prose, globs, target directory scans, or "all files under allowed
   roots". Do not run `bubble commit`, `bubble merge`, `bubble approve`, or
   lifecycle cleanup as part of extract.
5. Allowed resolution path: after preconditions and path selection pass, create
   only the required target parent directories, copy each selected file's bytes
   to the matching target path, and in commit mode stage exactly the normalized
   selected target paths before verifying staged scope and committing.
6. Missing-data rule: any read/write/stat/git failure returns a structured
   failed extract result after preserving the source bubble lifecycle. Partial
   target files may exist after copy, stage, commit, or SHA-resolution failures;
   staged selected paths may remain after stage or commit execution failures;
   and a target commit may already exist if only post-commit SHA resolution
   fails. Commit mode must not attempt commit execution unless staged scope is
   exactly the selected normalized paths.
7. Phase boundary: this task closes transfer and optional commit execution. It
   does not add operator docs, final end-to-end validation coverage, overwrite
   behavior, glob support, lifecycle cleanup, or extraction from non-ideation
   bubbles.

### Plan Linkage

1. Parent plan gap closed: no official extract transfer/commit flow exists.
2. Depends on:
   - task `1-extract-command-contract`, which introduced command parsing,
     ideation eligibility, repo resolution, checkout preconditions, and commit
     intent.
   - task `2-extract-path-selection`, which introduced explicit path validation,
     source-file checks, target conflict checks, and `selectedPaths`.
3. Unlocks / impacts successor:
   - task `4-extract-docs-validation` owns operator docs, broader lifecycle
     non-mutation proof, and final validation matrix.
4. Task-list impact: creates planned task `3-extract-copy-commit`; it does not
   replace or obsolete any task id.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/application/extract/extractCommandContract.ts`
   - `src/v11/application/extract/extractPathSelection.ts`
   - `src/v11/application/extract/extractTransfer.ts`
   - `src/v11/application/extract/emitExtractV11.ts`
   - `src/v11/application/extract/extractCliCommand.ts`
   - `src/v11/defaults/extract/extractCommandDefaults.ts`
   - `tests/cli/bubbleExtractCommand.test.ts`
   - `tests/cli/index.test.ts`
2. Canonical elements:
   - `selectedPaths` is the only transfer authority.
   - normalized selected-path uniqueness is required before any filesystem or
     git side effect.
   - `commitRequested=true` authorizes only selected-path staging and commit.
   - success must expose copied paths; commit success must expose staged paths,
     commit SHA, and effective `commitMessage`.
3. Guard elements:
   - checkout preconditions and target no-conflict checks remain upstream guards.
   - raw duplicate diagnostics from upstream tasks remain advisory; this task's
     hard duplicate gate is based on normalized selected target paths.
4. Compat elements:
   - existing failure reason codes from tasks 1 and 2 must keep their meanings.
   - `EXTRACT_TRANSFER_NOT_IMPLEMENTED` is removed from the success path by this
     task, but may be deleted or retained only if no public consumer requires it.
   - the existing input-level `message` field remains the requested message;
     success records the effective message as `commitMessage`.
5. Forbidden reinterpretations:
   - Accepted selected paths do not authorize overwrite.
   - Copy success does not imply source-bubble lifecycle completion.
   - `--commit` does not authorize staging unrelated target checkout changes.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `extractBubbleV11` currently returns `implementation_deferred` after
     valid path selection.
   - `renderBubbleExtractText` currently reports that no files were copied.
   - default extract dependencies provide filesystem metadata and git command
     ports but not copy/write or directory-creation ports yet.
   - CLI tests currently assert deferred transfer behavior.
2. Actual touched scope: transfer producer, optional commit producer, result
   contract extension, CLI text update, and targeted tests.
3. Mutation entrypoints in scope:
   - target filesystem writes under selected `plans/**`, `docs/**`, or
     `progress/**` paths.
   - git staging/commit on the clean `main` target checkout when `--commit` is
     present.
4. Hidden scope ruled out: docs/operator guide, final broad validation,
   lifecycle cleanup, overwrite/replace, glob expansion, and non-ideation
   extraction remain successor or future scopes.
5. Dependency reality: this task likely needs dependency ports for copying files,
   creating target parent directories, and reading/validating staged paths and
   commit SHA through `runGit`.
6. Baseline duplicate reality: `extractBubbleV11` currently reports duplicate
   raw `input.paths` only as diagnostics after successful path validation. This
   task must add a deterministic normalized duplicate check over the validated
   `selectedPaths` and make it fail before target parent creation, copy,
   staging, or commit.
7. Why the declared task shape matches reality: transfer and selected-path
   commit share the same already-validated selected-path authority and the same
   final result surface; docs and final end-to-end coverage are separate
   consumer/activation polish.

### Bounded Task Shape / Closure Budget

1. Primary shape: `authority_producer`.
2. Secondary adjacent shape: `activation_or_read_model`, limited to extract
   result shape and CLI text for the same `extractBubbleV11` command path.
3. Closure buckets touched:
   - `authority_producer`: copy selected files and optionally create the
     selected-path commit.
   - `shared_contract`: replace deferred success with copy/commit success result
     fields and add failure reason codes.
   - `internal_execution_consumers`: `extractBubbleV11`.
   - `read_model_consumers`: CLI text and JSON result surface.
   - `cleanup_recovery_consumers`: explicitly unchanged; source bubble lifecycle
     cleanup remains out of scope.
4. Collapsed closures:
   - transfer producer, selected-path commit producer, and result text are
     collapsed because they share the same `selectedPaths` authority, the same
     command entrypoint, and the same success/failure result surface.
5. Deferred closures:
   - operator docs, broad final validation, lifecycle cleanup, overwrite/replace,
     glob support, and non-ideation extraction.
   - no coordination primitives, rollback/retry cleanup, or source lifecycle
     mutation are introduced.

### Capability Closure

| Field | Contract |
|---|---|
| capability_claim | `pairflow bubble extract` can copy selected ideation artifacts into `main`, and can optionally commit exactly those selected paths. |
| activation_trigger | `pairflow bubble extract --id <id> --path <path> [--path <path>...] [--repo <path>] [--commit] [--message <text>]` |
| entrypoint | `runBubbleExtractCommand` -> `extractBubbleV11` |
| configuration_owner | Repo defaults plus operator-supplied CLI flags; no new config owner. |
| repo_provided_parts | CLI command, extract application flow, filesystem dependency defaults, git dependency defaults, targeted tests. |
| external_prerequisites | Existing ideation bubble, source files at selected paths, clean target checkout on `main`, local git availability. |
| success_output_contract | Copy-only result records `status=success`, `copiedPaths`, and no commit SHA; commit result records `status=success`, `copiedPaths`, exact `stagedPaths`, `commitSha`, and effective `commitMessage`. |
| failure_output_contract | Structured `status=failed` with reason code and diagnostics; no source-bubble lifecycle mutation; no commit unless staged scope exactly matches selected paths, and commit-SHA resolution failure may leave an already-created target commit. |
| operator_or_user_path | CLI command above, with output text or JSON showing copy/commit result. |
| last_mile_proof | Targeted CLI/app tests that exercise copy-only and commit mode through the real command path in temporary git repositories. |
| closure_classification | `end_to_end` for copy/commit execution slice; final docs and broad regression matrix remain task 4. |

### In Scope

1. Add transfer result shapes and reason codes needed for copy/commit failures.
2. Add dependency defaults for creating target parent directories and copying
   source bytes to target paths.
3. Copy every validated selected path to the matching target path after
   preconditions and path selection pass.
4. In copy-only mode, return success with copied path evidence and no staged or
   committed files.
5. In commit mode, stage exactly the normalized selected target paths, verify the
   staged file list exactly matches those normalized paths, commit with the
   supplied message or deterministic default, and return commit SHA plus
   effective commit-message evidence.
6. Update CLI text/JSON-facing result behavior to report real copy/commit
   success rather than implementation-deferred transfer.
7. Add targeted tests for copy-only, multi-path copy, normalized duplicate
   failure, commit mode, default commit message, staged-scope mismatch failure,
   copy failure, git stage failure, git commit/SHA resolution failure, and
   source-bubble lifecycle non-mutation at this slice's boundary.

### Out of Scope

1. Overwriting existing target paths.
2. Glob support or directory extraction.
3. Extracting product/runtime source code paths.
4. Deleting, closing, approving, merging, or mutating the source bubble
   lifecycle.
5. Operator documentation and final broad validation matrix owned by
   `4-extract-docs-validation`.
6. Interactive diff review or dry-run UI.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Transfer authority | `selectedPaths` is the only copy source. | Do not inspect git status or source directories to add paths. | P1 | required-now |
| Target write boundary | Writes go only to `selectedPaths[].targetPath`. | Create only needed parent directories and copy file bytes. | P1 | required-now |
| Commit authority | `--commit` authorizes selected-path commit only. | Stage selected normalized paths only; reject staged mismatch. | P1 | required-now |
| Lifecycle boundary | Extract is not bubble close. | Do not call source-bubble approve/commit/merge/delete. | P1 | required-now |
| Success proof | Results must expose actual copy/commit evidence. | Replace deferred transfer result with success result shapes. | P1 | required-now |
| Failure proof | Failures must be structured and non-lifecycle-mutating. | Add reason codes/diagnostics for copy and git failure surfaces. | P1 | required-now |

### 0a) Canonical Contract Matrix

| ID | Case | Owner | Result | Reason Code | Side Effects | Test |
|---|---|---|---|---|---|---|
| CCM1 | Valid selected path, no `--commit` | current task | `status=success`, copied path recorded, no commit fields | N/A | target file copied | T1 |
| CCM2 | Multiple valid selected paths | current task | copied paths retained in selected order | N/A | each target file copied | T2 |
| CCM3 | Two raw paths normalize to the same path | current task | `status=failed` before parent directory creation, copy, staging, or commit | `EXTRACT_DUPLICATE_SELECTED_PATH` | none | T3 |
| CCM4 | Parent directory missing on target | current task | parent directory created then file copied | N/A | selected target parent dirs/files only | T4 |
| CCM5 | Copy operation fails | current task | `status=failed` | `EXTRACT_COPY_FAILED` | no commit; prior copied selected files may remain if already written | T5 |
| CCM6 | `--commit` with explicit message | current task | `status=success`, staged paths, commit SHA, and effective `commitMessage` recorded | N/A | selected files copied, staged, committed | T6 |
| CCM7 | `--commit` without message | current task | `status=success`, deterministic default `commitMessage`, staged paths, and commit SHA recorded | N/A | selected files copied, staged, committed | T7 |
| CCM8 | Staged list differs from normalized selected paths | current task | `status=failed` | `EXTRACT_STAGED_SCOPE_MISMATCH` | no commit; selected staged paths and mismatch-causing staged entries may remain for operator inspection | T8 |
| CCM9 | Git add fails | current task | `status=failed` | `EXTRACT_STAGE_FAILED` | copied selected files and partially staged selected paths may remain; no commit | T9 |
| CCM10 | Git commit execution fails | current task | `status=failed` | `EXTRACT_COMMIT_FAILED` | copied files and staged selected paths may remain; no commit SHA | T10 |
| CCM11 | Post-commit SHA resolution fails | current task | `status=failed` | `EXTRACT_COMMIT_FAILED` | target commit may already exist and staged paths may be clean; no success result because commit SHA evidence is incomplete | T11 |
| CCM12 | Precondition/path-selection failure | upstream tasks | existing failed result preserved | existing reason | no copy, stage, commit, or lifecycle mutation | T12 |
| CCM13 | Successful extract | current task | source bubble remains present and lifecycle state unchanged by extract | N/A | target copy/optional target commit only | T13 |

### 0b) Ownership and Deferred Semantics

| Surface / Decision | Owned Here | Emits / Records Only | Deferred Owner | Forbidden Interpretation | Priority |
|---|---|---|---|---|---|
| File copy | yes | copied path evidence | N/A | Copy does not imply bubble lifecycle close. | P1 |
| Selected-path staging | yes, only in commit mode | staged path evidence | N/A | Staged paths must not include unrelated files. | P1 |
| Commit creation | yes, only in commit mode | commit SHA and message evidence | N/A | Commit does not run `bubble commit`. | P1 |
| Operator docs | no | result text may be updated | `4-extract-docs-validation` | Tests here must not claim final docs are complete. | P2 |
| Lifecycle cleanup | no | source lifecycle non-mutation evidence | existing Pairflow lifecycle commands | Extract must not delete or close the bubble. | P1 |

### 0c) Structured Contract Rules

1. Success result required fields:
   - `status: "success"`
   - `bubbleId`
   - `repoPath`
   - `paths`
   - `commitRequested`
   - `selectedPaths`
   - `copiedPaths`
2. Commit success additional required fields:
   - `stagedPaths`
   - `commitSha`
   - `commitMessage`
3. Failure result:
   - must keep existing base fields and include `reasonCode`.
   - must include diagnostics sufficient to identify failed path or git step.
4. Unknown fields:
   - avoid adding output fields that imply docs validation, lifecycle cleanup, or
     overwrite behavior.
5. Duplicate selected paths:
   - if two raw paths normalize to the same `normalizedPath`, fail before parent
     directory creation, copy, staging, or commit.
   - reason code: `EXTRACT_DUPLICATE_SELECTED_PATH`.
   - diagnostics must include the duplicate normalized path and the raw paths
     that produced it.
   - `selectedPaths` order is preserved only for unique normalized paths.
   - this rule is evaluated after path-selection normalization succeeds and
     before any transfer helper is invoked.
6. Commit message:
   - use supplied `--message` when present.
   - otherwise use a deterministic default that includes the bubble id and
     selected-path extract purpose.
7. Staged-scope verification:
   - compare git staged file paths relative to target repo against the selected
     normalized path set.
   - mismatch must fail before commit.

### 0d) Mirrored Surface Checklist

1. `Canonical Contract Matrix` is the source of truth for current-task behavior.
2. `Domain / Control Model Summary` mirrors copy/commit authority and lifecycle
   boundary rows.
3. `Data / Result Contract` mirrors success and failure fields.
4. `Branch / Failure Inventory` mirrors each reason-code row.
5. `Acceptance Criteria` and `Validation Strategy` mirror the test column.
6. CLI text tests mirror the success/deferred wording change but do not become
   the canonical result contract.

### 1) Data / Result Contract

1. Extend `ExtractCommandFailureReasonCode` with copy/commit failure reasons
   needed by the matrix.
2. Replace `ExtractCommandImplementationDeferredResult` as the successful
   post-validation output for this phase with a success result shape.
3. Keep `ExtractSelectedPath` as the bridge from path validation to transfer.
4. Add copied/staged/commit evidence fields only where the action happened.
5. Keep diagnostics optional but precise enough for failing path/git step
   assertions.

### 2) Execution Flow

1. Run existing command preconditions first.
2. Run existing path selection second.
3. Resolve deterministic selected transfer set according to duplicate policy.
4. Create target parent directories and copy files in selected-path order.
5. If `commit=false`, return success immediately with copied evidence.
6. If `commit=true`:
   - stage selected normalized paths only, using repo-relative pathspecs from
     the target repository root.
   - read staged paths.
   - compare staged paths to selected normalized paths.
   - commit with explicit or default message.
   - read or capture commit SHA.
   - return success with staged, commit SHA, and effective commit-message
     evidence.

### 3) Branch / Failure Inventory

1. Preserve existing precondition and path-selection failures with zero copy,
   staging, commit, or lifecycle side effects.
2. `EXTRACT_DUPLICATE_SELECTED_PATH`: two or more raw paths normalize to the same
   selected target path; fail before filesystem or git side effects.
3. `EXTRACT_COPY_FAILED`: target parent creation or file copy failed; diagnostics
   identify the selected path and failing filesystem step where available.
4. `EXTRACT_STAGE_FAILED`: selected-path `git add` failed; diagnostics identify
   the git step and selected paths; copied selected files and partially staged
   selected paths may remain.
5. `EXTRACT_STAGED_SCOPE_MISMATCH`: staged paths differ from selected normalized
   paths after staging; selected staged paths and mismatch-causing staged entries
   may remain for operator inspection, but no commit is created.
6. `EXTRACT_COMMIT_FAILED`: git commit or commit SHA resolution failed.
   Diagnostics must identify whether the failing step was commit execution or
   post-commit SHA resolution. If commit execution failed, staged selected paths
   may remain for operator inspection. If commit execution succeeded but SHA
   resolution failed, a target commit may already exist and staged paths may be
   clean; the result still fails because success evidence is incomplete.
7. Every current-task failure must leave source bubble lifecycle untouched.

### 4) Acceptance Criteria

1. Copy-only extract writes selected files to the target checkout and returns a
   success result with `copiedPaths`.
2. Multi-path extract preserves explicit selected order in result evidence when
   normalized paths are unique.
3. Duplicate normalized selected paths fail before parent directory creation,
   copy, staging, or commit.
4. Commit mode stages and commits exactly the selected normalized paths.
5. Commit mode records `stagedPaths`, `commitSha`, and effective
   `commitMessage`.
6. Staged-scope mismatch fails before commit and records that selected staged
   paths plus mismatch-causing staged entries may remain for operator inspection.
7. Copy failure returns `EXTRACT_COPY_FAILED` with selected path and filesystem
   step diagnostics where available, and never commits.
8. Git stage failure returns `EXTRACT_STAGE_FAILED` with git-step and selected
   path diagnostics; copied selected files and partially staged selected paths
   may remain, but it never commits.
9. Git commit failure returns `EXTRACT_COMMIT_FAILED`; copied files and staged
   selected paths may remain for operator inspection, and no commit SHA is
   reported as success evidence.
10. Post-commit SHA resolution failure returns `EXTRACT_COMMIT_FAILED` with
   diagnostics for the SHA-resolution step; a target commit may already exist
   and staged paths may be clean, but the result is not success because commit
   SHA evidence is incomplete.
11. Existing precondition/path validation failures still prevent copy, staging,
   and commit.
12. CLI text no longer says transfer is unimplemented on successful extract.
13. Tests prove the source bubble artifact/lifecycle is not deleted, approved,
   committed, merged, or otherwise closed by extract.

## L2 - Implementation Notes

1. Prefer adding small helper functions under `src/v11/application/extract/**`
   rather than expanding `emitExtractV11.ts` into a large mixed flow. If a new
   helper file is added, `extractTransfer.ts` is the expected first location for
   copy/commit orchestration.
2. Use dependency ports for filesystem mutation so unit tests can cover failure
   branches without real writes.
3. Extend `ExtractCommandDependencies` and the default extract dependencies with
   parent-directory creation and file-copy ports; keep existing metadata ports
   unchanged.
4. Use `runGit` with explicit cwd/working-directory options consistent with the
   existing git port usage.
5. Normalize staged path comparison to POSIX repo-relative paths.
6. Keep `renderBubbleExtractText` concise: copy success should report copied
   count; commit success should also report commit SHA and effective
   commit-message evidence without implying broader lifecycle cleanup.
7. When adding real-repo CLI tests, use temporary repositories and existing test
   helpers; avoid relying on the developer checkout state.
8. Do not add docs in this task unless a test-facing help line must change to
   avoid lying about the result.
9. Do not require the final operator documentation matrix here; task
   `4-extract-docs-validation` owns broad docs and final end-to-end activation
   proof after this implementation has settled.

## Validation Strategy

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. Targeted tests:
   - `pnpm vitest run tests/cli/bubbleExtractCommand.test.ts`
   - `pnpm vitest run tests/cli/index.test.ts`
   - cover every Canonical Contract Matrix test row T1-T13, including copy-only
     success, multi-path ordering, parent directory creation, explicit commit
     message success, deterministic default commit-message success, copy failure,
     git stage failure, staged-scope mismatch with retained staged-side-effect
     expectations, git commit failure, post-commit SHA resolution failure,
     upstream precondition/path-selection preservation, and source-bubble
     lifecycle non-mutation.
   - include duplicate-normalized-path failure coverage for
     `EXTRACT_DUPLICATE_SELECTED_PATH`, including proof that no target parent
     directory is created before this failure.
5. `pnpm test`
6. `pnpm build`
