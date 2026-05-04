---
artifact_type: task
artifact_id: task_extract_path_selection_v1
task_family_id: extract-path-selection
sequence_key: "2"
task_id: 2-extract-path-selection
title: "Extract Path Selection"
status: approved
phase: phase2
target_files:
  - src/v11/application/extract/extractCommandContract.ts
  - src/v11/application/extract/extractPathSelection.ts
  - src/v11/application/extract/extractCommandPreconditions.ts
  - src/v11/application/extract/emitExtractV11.ts
  - src/v11/defaults/extract/extractCommandDefaults.ts
  - tests/cli/bubbleExtractCommand.test.ts
prd_ref: null
plan_ref: plans/ideation-bubble-extract-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/ideation-bubble-extract-plan-v1.md
  - plans/archive/tasks/2026-05-04-ideation-bubble-extract-plan-v1/1-extract-command-contract.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 2-extract-path-selection-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-04-ideation-bubble-extract-plan-v1
---

# Task: Extract Path Selection

## L0 - Policy

### Goal

Implement the safe selected-path contract consumed by `pairflow bubble extract`.
This task validates the repeated explicit `--path` list after command and
checkout preconditions pass, without copying files and without staging or
committing anything.

### Domain / Control Model Summary

1. Business invariant: only explicitly selected ideation artifacts may become
   extract candidates; unrelated bubble worktree changes must never be inferred
   or selected.
2. Control model: the parsed CLI `paths` list is the only candidate source, the
   bubble worktree is the source-file authority, and the clean `main` checkout
   is the target-conflict authority.
3. Read-path rule: this task may inspect path strings, source file metadata in
   the bubble worktree, and target path existence in the resolved repository.
   It must not read source file contents for transfer and must not write target
   files.
4. Forbidden fallback: no glob expansion, no directory extraction, no absolute
   paths, no `..` traversal, no git-status inference, no transcript/prose path
   discovery, and no overwrite/replace of existing target paths.
5. Allowed resolution path: normalize each explicit path as a repo-relative
   POSIX-style file path, require it to stay under `plans/**`, `docs/**`, or
   `progress/**`, require the source path to be an existing file in the bubble
   worktree, and fail closed if the target path already exists on `main`.
6. Missing-data rule: missing source worktree, unsafe path shape, forbidden
   scope, directory source, missing source file, or target conflict returns a
   structured failure before copy, staging, commit, or source-bubble lifecycle
   mutation.
7. Phase boundary: this task owns candidate validation only. File transfer,
   selected-path staging, selected-path commit result, docs, and end-to-end
   operator proof remain successor scopes.

### Plan Linkage

1. Parent plan gap closed: no safe multi-path artifact selector exists.
2. Depends on: archived task `1-extract-command-contract`, which introduced the
   command parser, precondition taxonomy, duplicate-path diagnostics, and
   implementation-deferred result.
3. Unlocks / impacts successors:
   - `3-extract-copy-commit` consumes the validated selected-path set and target
     no-conflict proof.
   - `4-extract-docs-validation` consumes the final reason codes and examples.
4. Task-list impact: refines planned task `2-extract-path-selection`; it does
   not replace or obsolete any task id.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/application/extract/extractCommandContract.ts`
   - `src/v11/application/extract/extractCommandPreconditions.ts`
   - `src/v11/application/extract/emitExtractV11.ts`
   - `src/v11/defaults/extract/extractCommandDefaults.ts`
   - `plans/archive/tasks/2026-05-04-ideation-bubble-extract-plan-v1/1-extract-command-contract.md`
   - `docs/architecture/v11-placement-and-extraction-governance.md`
2. Canonical elements:
   - repeated `--path` values are retained in explicit operator order.
   - allowed v1 extraction scope is exactly `plans/**`, `docs/**`, and
     `progress/**`.
   - existing target paths fail closed; overwrite is deferred.
3. Guard elements:
   - selected paths are candidate artifacts, not copied artifacts.
   - duplicate path diagnostics may remain advisory unless they threaten staged
     scope in successor tasks.
4. Forbidden reinterpretations:
   - Do not make a valid selected path imply file transfer completed.
   - Do not broaden scope to product/runtime code paths.
   - Do not accept shell globs or directories as path contracts.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/application/extract/extractCommandContract.ts`
   - `src/v11/application/extract/extractCommandPreconditions.ts`
   - `src/v11/application/extract/emitExtractV11.ts`
   - `src/v11/defaults/extract/extractCommandDefaults.ts`
   - `src/v11/shared/ports/bubbleLookup.ts`
   - `tests/cli/bubbleExtractCommand.test.ts`
2. Actual touched scope: selected-path validation and result-contract extension
   after command/precondition success and before transfer implementation.
3. Mutation entrypoints in scope: `extractBubbleV11` orchestration only. This
   task may inspect filesystem metadata for source/target paths but must not
   copy, create directories, stage, commit, delete, close, approve, or merge.
4. Hidden scope ruled out: transfer, selected-path staging, selected-path commit
   result, docs/operator examples, and source-bubble cleanup remain successor
   scopes.
5. Dependency reality: directory rejection requires file-vs-directory metadata,
   so the dependency/default wiring must expose a file-type check or equivalent
   stat result; `fileExists` alone is insufficient for `EXTRACT_SOURCE_PATH_NOT_FILE`.
6. Why the declared task shape matches reality: the same bounded extract path
   validator owns normalization, allowlist, source-file metadata, and target
   no-conflict proof without writing files.

### Authority Boundary Map

1. Authority producer: this task produces the validated selected-path set and
   path-selection failure taxonomy.
2. Stored authority: TypeScript result types and tests only; no persisted
   runtime authority or schema is introduced.
3. In-scope consumers: `extractBubbleV11` and successor task
   `3-extract-copy-commit`.
4. Explicit out-of-scope consumers: file transfer, git staging/commit execution,
   docs/operator examples, UI surfaces, and bubble lifecycle cleanup.
5. Export surfaces closed in this phase: TypeScript path-selection result shape
   and CLI-facing reason codes. End-to-end extract capability remains open.

### Baseline Preservation

1. Must-preserve behaviors:
   - Task 1 parser/help behavior for repeated `--path`, `--repo`, `--commit`,
     `--message`, and `--json` remains unchanged.
   - Ideation eligibility, repo mismatch, target checkout preconditions,
     duplicate diagnostics, and message-without-commit behavior remain intact.
   - Successful validation must still report transfer as implementation-deferred
     until `3-extract-copy-commit`.
2. Allowed resolution paths:
   - Use `resolvedBubble.bubblePaths.worktreePath` as the source worktree root.
   - Use `targetRepoPath` as the target repository root after preconditions pass.
   - Use explicit filesystem metadata checks for source file-vs-directory and
     target existence.
3. Forbidden regression interpretations:
   - Do not use git status, changed-file lists, transcript text, or glob
     expansion to add paths.
   - Do not treat accepted selected paths as copied or committed artifacts.
   - Do not broaden the v1 allowlist beyond `plans/**`, `docs/**`, and
     `progress/**`.
4. Replacement proof required if removed: any changed precondition/result flow
   must keep task 1 failure reason tests passing and prove path validation still
   runs only after extract preconditions pass.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `authority_producer`.
2. Secondary adjacent shape: `shared_contract`, limited to typed result and
   reason-code additions consumed by successor tasks.
3. Preconditions that must pass before path-selection validation:
   - bubble resolves and is ideation-eligible.
   - target repository resolves and matches bubble metadata.
   - target checkout preconditions pass.
4. Side effects forbidden before and during this task: file copy, target
   directory creation, git staging, git commit, source-bubble state writes, and
   source-bubble lifecycle mutation.
5. Invalid/path-failure behavior: first blocking path may fail closed with a
   structured reason and zero side effects.
6. Coordination primitives in scope: N/A.

### Closure / Risk Triage

1. Complexity risk: `risk_score=5`.
2. Risk basis: authority result shape changes, runtime extract entrypoint
   integration, source/target identity join, and successor copy/commit consumers.
3. Split decision: keep as one bounded task because it owns one adjacent
   validation producer path and explicitly defers transfer, commit, docs, and
   cleanup.
4. Identity join risk: source paths are resolved under the bubble worktree while
   target conflict checks resolve under the clean main checkout; no same-path
   inference from git status is allowed.
5. Authority/source-of-truth note: parsed `paths` is the candidate authority,
   bubble worktree metadata is the source-file authority, and target repo
   existence is the conflict authority.
6. Closure buckets touched: `authority_producer`, `shared_contract`, and
   `internal_execution_consumers`.
7. Collapsed closures: path validation producer and its typed result contract.
8. Deferred closures: file transfer, selected-path commit/staged-scope proof,
   read-model/operator docs, end-to-end activation proof, and cleanup/rollout.

### In Scope

1. Define selected-path validation result and failure reason codes.
2. Add path normalization that rejects absolute paths, empty paths, `.`, `..`,
   traversal, backslash escape ambiguity, and glob metacharacter patterns.
3. Enforce the v1 allowlist: `plans/**`, `docs/**`, and `progress/**`.
4. Check that each selected source path exists as a file in the bubble worktree.
5. Check that each corresponding target path does not already exist in the
   target repository.
6. Integrate path-selection validation after extract preconditions pass and
   before returning implementation-deferred transfer.
7. Add targeted tests for valid multiple paths, forbidden paths, glob-like
   paths, directories, missing source files, and target conflicts.

### Out of Scope

1. Copying selected files into the target repository.
2. Creating target directories.
3. Staging or committing selected paths.
4. Deleting, closing, approving, merging, or mutating the source bubble.
5. Docs/operator examples beyond test-facing help/result wording needed for this
   slice.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Candidate source | Parsed `paths` is the only candidate source. | Do not inspect git status or bubble changed-files lists to add paths. | P1 | required-now |
| Path shape | Paths must be repo-relative file paths. | Reject absolute paths, empty paths, `.`/`..`, traversal, backslashes, directories, and glob-like strings. | P1 | required-now |
| Allowed scope | Only `plans/**`, `docs/**`, and `progress/**` are extractable in v1. | Runtime/product code paths fail before source reads or target writes. | P1 | required-now |
| Source authority | Bubble worktree owns selected source file existence/type. | Validate existing file only; do not copy/read content. | P1 | required-now |
| Target authority | Target repository owns conflict/no-overwrite truth. | Existing target path fails closed. | P1 | required-now |
| Phase boundary | Validation only. | Successful path selection still returns no copied files and no commit SHA. | P1 | required-now |

### 0a) Canonical Contract Matrix

| ID | Case | Owner | Result | Reason Code | Side Effects | Test |
|---|---|---|---|---|---|---|
| PCM1 | `plans/new-plan.md` source file exists and target absent | current task | selected path accepted | N/A | none | T1 |
| PCM2 | multiple explicit valid paths | current task | selected paths retained in order | N/A | none | T2 |
| PCM3 | absolute path | current task | structured failure | `EXTRACT_PATH_UNSAFE` | none | T3 |
| PCM4 | path contains `..` traversal | current task | structured failure | `EXTRACT_PATH_UNSAFE` | none | T4 |
| PCM5 | glob-like path such as `plans/*.md` | current task | structured failure | `EXTRACT_PATH_GLOB_UNSUPPORTED` | none | T5 |
| PCM6 | path outside allowlist such as `src/foo.ts` | current task | structured failure | `EXTRACT_PATH_SCOPE_FORBIDDEN` | none | T6 |
| PCM7 | selected source is missing | current task | structured failure | `EXTRACT_SOURCE_PATH_MISSING` | none | T7 |
| PCM8 | selected source is a directory | current task | structured failure | `EXTRACT_SOURCE_PATH_NOT_FILE` | none | T8 |
| PCM9 | target path already exists | current task | structured failure | `EXTRACT_TARGET_PATH_EXISTS` | none | T9 |
| PCM10 | valid selected paths after all checks | current task | implementation remains deferred to transfer | `EXTRACT_TRANSFER_NOT_IMPLEMENTED` | none | T10 |

### 0b) Ownership and Deferred Semantics

| Surface / Decision | Owned Here | Emits / Records Only | Deferred Owner | Forbidden Interpretation | Priority |
|---|---|---|---|---|---|
| Normalized selected paths | yes | yes | `3-extract-copy-commit` | Accepted path does not mean copied path. | P1 |
| Source file existence/type | yes | yes | N/A | Missing source must not be created or skipped. | P1 |
| Target conflict detection | yes | yes | future overwrite contract | Existing target must not be overwritten. | P1 |
| Target directory creation | no | no | `3-extract-copy-commit` | Validation must not create directories. | P1 |
| Selected-path commit scope | no | no | `3-extract-copy-commit` | Validation must not stage or commit. | P1 |

### 0c) Structured Contract Rules

| Contract | Required Fields | Optional Fields | Unknown / Malformed Behavior | Retention Rule | Fallback Status / Reason | Priority |
|---|---|---|---|---|---|---|
| Selected path input | raw path string | none | fail closed on unsafe/malformed shape | preserve explicit order | `failed` with exact path reason | P1 |
| Selected path output | `rawPath`, `normalizedPath`, `sourcePath`, `targetPath` | duplicate diagnostic | unknown variants forbidden by union | preserve order after validation | implementation deferred until transfer task | P1 |
| Path validation failure | `reasonCode`, `path`, `diagnostics` | source/target path detail | first blocking path may fail command | no file content retained | no side effects | P1 |

### 1) File / Module Contract

| Target | Required Change | Priority | Timing |
|---|---|---|---|
| `src/v11/application/extract/extractCommandContract.ts` | Add path-selection result/failure types and reason codes. | P1 | required-now |
| `src/v11/application/extract/extractPathSelection.ts` | New focused validator for path shape, allowlist, source file type, and target conflict. | P1 | required-now |
| `src/v11/application/extract/extractCommandPreconditions.ts` | Expose or preserve worktree/target repo data needed by the path selector. | P1 | required-now |
| `src/v11/application/extract/emitExtractV11.ts` | Call path selection after preconditions pass and before implementation-deferred transfer. | P1 | required-now |
| `src/v11/defaults/extract/extractCommandDefaults.ts` | Wire any file-type metadata dependency needed by directory/source-file checks. | P1 | required-now |
| `tests/cli/bubbleExtractCommand.test.ts` | Add targeted path-selection tests and preserve task1 parser/precondition coverage. | P1 | required-now |

### 2) Acceptance Criteria

| ID | Criterion | Priority | Timing |
|---|---|---|---|
| AC1 | Valid repeated paths under `plans/**`, `docs/**`, and `progress/**` are accepted in provided order when source files exist and targets are absent. | P1 | required-now |
| AC2 | Absolute paths, empty paths, traversal, and backslash-ambiguous paths fail with `EXTRACT_PATH_UNSAFE` or a single canonical equivalent. | P1 | required-now |
| AC3 | Glob-like path strings fail with `EXTRACT_PATH_GLOB_UNSUPPORTED` or a single canonical equivalent. | P1 | required-now |
| AC4 | Paths outside the v1 allowlist fail with `EXTRACT_PATH_SCOPE_FORBIDDEN` or a single canonical equivalent. | P1 | required-now |
| AC5 | Missing source files and source directories fail before any target write. | P1 | required-now |
| AC6 | Existing target paths fail with a no-overwrite reason before copy/stage/commit. | P1 | required-now |
| AC7 | Successful validation still reports transfer as implementation-deferred and does not claim copied files, staged files, commit SHA, or source-bubble cleanup. | P1 | required-now |
| AC8 | Existing task1 behavior remains intact: explicit `--repo`, ideation eligibility, checkout preconditions, duplicate diagnostics, and message-without-commit handling. | P1 | required-now |

### 3) Test Matrix

| ID | Test | Required Assertion | Priority | Timing |
|---|---|---|---|---|
| T1 | Single valid plan path | Accepted selected path includes normalized repo-relative path. | P1 | required-now |
| T2 | Multiple valid paths | Accepted paths preserve explicit order. | P1 | required-now |
| T3 | Absolute path | Command fails with unsafe path reason and no side effects. | P1 | required-now |
| T4 | Traversal path | Command fails with unsafe path reason and no side effects. | P1 | required-now |
| T5 | Glob-like path | Command fails with glob-unsupported reason and no side effects. | P1 | required-now |
| T6 | Runtime source path | `src/foo.ts` fails with scope-forbidden reason. | P1 | required-now |
| T7 | Missing source | Missing bubble-worktree file fails with source-missing reason. | P1 | required-now |
| T8 | Source directory | Directory source fails with source-not-file reason. | P1 | required-now |
| T9 | Target conflict | Existing target path fails with target-exists reason. | P1 | required-now |
| T10 | Valid path selection boundary | Result remains implementation-deferred with no copied/staged/committed fields. | P1 | required-now |

## L2 - Hardening Backlog

1. `later-hardening`: support overwrite/replace only behind a future explicit
   operator contract with diff/audit proof.
2. `later-hardening`: consider dry-run summaries after copy/commit result shapes
   exist.
3. `later-hardening`: consider more precise duplicate-path policy if successor
   staged-scope proof needs deduplication rather than diagnostics.

## Validation

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm vitest tests/cli/bubbleExtractCommand.test.ts`
5. `pnpm test`
6. `pnpm build`

## Review Provenance

Task-mode ReviewSpec approved this artifact on 2026-05-04 after refining the
target-file reality scope to include extract defaults wiring for source
file-type checks. Decision: `approve_task`.
