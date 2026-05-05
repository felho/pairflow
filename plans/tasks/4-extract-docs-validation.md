---
artifact_type: task
artifact_id: task_extract_docs_validation_v1
task_family_id: extract-docs-validation
sequence_key: "4"
task_id: 4-extract-docs-validation
title: "Extract Docs And Validation"
status: approved
phase: phase4
target_files:
  - README.md
  - docs/README.md
  - docs/llm-doc-workflow-v1.md
  - tests/cli/bubbleExtractCommand.test.ts
  - tests/cli/index.test.ts
prd_ref: null
plan_ref: plans/ideation-bubble-extract-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/ideation-bubble-extract-plan-v1.md
  - plans/archive/tasks/2026-05-04-ideation-bubble-extract-plan-v1/1-extract-command-contract.md
  - plans/archive/tasks/2026-05-04-ideation-bubble-extract-plan-v1/2-extract-path-selection.md
  - plans/archive/tasks/2026-05-04-ideation-bubble-extract-plan-v1/3-extract-copy-commit.md
  - docs/llm-doc-workflow-v1.md
  - docs/README.md
owners:
  - "felho"
doc_bubble_id: 4-extract-docs-validation-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-04-ideation-bubble-extract-plan-v1
---

# Task: Extract Docs And Validation

## L0 - Policy

### Goal

Close the final `pairflow bubble extract` slice after tasks 1-3 by documenting
the operator workflow and adding targeted regression coverage for the complete
safe extraction contract.

This task must not change product/runtime source. If a targeted test exposes a
product defect, record the failure and route the fix to a follow-up
implementation task instead of widening this docs/validation task.

### Domain / Control Model Summary

1. Business invariant: only explicitly selected ideation artifacts may be
   promoted into `main`; docs and tests must not describe or permit hidden
   branch merge, inferred file selection, overwrite, or lifecycle cleanup.
2. Control model: tasks 1-3 own runtime command, path-selection, copy, and
   selected-path commit behavior. This task owns operator documentation,
   final regression tests, and validation evidence against those closed
   contracts.
3. Read-path rule: documentation and tests may read the closed extract contract
   from the parent plan, archived task specs, current extract source modules,
   and current CLI behavior. Tests must exercise the public CLI/application
   entrypoints rather than reconstructing behavior from prose.
4. Forbidden fallback: do not infer extractable paths from git status,
   transcript refs, agent prose, glob expansion, directories, or "all changed
   files". Do not use source-bubble lifecycle state as proof that extraction
   succeeded.
5. Allowed resolution path: document and validate the v1 deterministic path:
   ideation bubble metadata, explicit repeated `--path`, target repo resolution
   by `--repo` or cwd ancestry, repo metadata match, clean `main` checkout,
   no target conflict, selected-file copy, and optional selected-path-only
   commit result.
6. Missing-data rule: if any required source bubble, target repo, selected
   source path, checkout state, staged-scope, or commit evidence is missing,
   docs and tests must expect a structured fail-closed result and no source
   lifecycle mutation.
7. Phase boundary:
   - contract closure: preserved from tasks 1-3; this task may document it but
     must not reopen or reinterpret it.
   - producer closure: not owned here; runtime producer code is closed by tasks
     1-3.
   - internal execution closure: validation-only coverage for existing behavior.
   - workflow/orchestration closure: operator-facing docs and CLI help coverage.
   - read-model closure: documentation and test assertions for text/JSON result
     surfaces.
   - activation closure: owned here as final operator workflow proof.
   - cleanup/recovery closure: validation-only proof that extract does not
     mutate source-bubble lifecycle; cleanup remains existing lifecycle commands.

### Plan Linkage

1. Parent plan gap closed: extract behavior would remain undocumented and
   regression-prone.
2. Depends on: archived task `3-extract-copy-commit`, plus archived tasks
   `1-extract-command-contract` and `2-extract-path-selection`.
3. Unlocks / impacts successors: N/A; this is the final planned docs/tests and
   validation slice for the plan.
4. Task-list impact: creates planned task `4-extract-docs-validation`; it does
   not replace or obsolete any task id.
5. Inherited validation / exit expectation: final evidence must cover success,
   multi-path, forbidden path, target conflict, repo mismatch, non-main/dirty
   target checkout, staged-scope, selected-path commit result, and source-bubble
   lifecycle non-mutation.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/ideation-bubble-extract-plan-v1.md`
   - `plans/archive/tasks/2026-05-04-ideation-bubble-extract-plan-v1/1-extract-command-contract.md`
   - `plans/archive/tasks/2026-05-04-ideation-bubble-extract-plan-v1/2-extract-path-selection.md`
   - `plans/archive/tasks/2026-05-04-ideation-bubble-extract-plan-v1/3-extract-copy-commit.md`
   - `src/v11/application/extract/extractCommandContract.ts`
   - `src/v11/application/extract/emitExtractV11.ts`
   - `src/v11/application/extract/extractPathSelection.ts`
   - `src/v11/application/extract/extractTransfer.ts`
   - `src/v11/application/extract/extractCliCommand.ts`
2. Canonical elements:
   - `--ideation` metadata makes a bubble extract-eligible; `task_pending` is
     not extract eligibility.
   - repeated `--path` values are the only transferable file authority.
   - allowed v1 extraction roots are exactly `plans/**`, `docs/**`, and
     `progress/**`.
   - existing target paths fail closed; overwrite remains deferred.
   - `--commit` authorizes only selected-path staging and commit.
   - success reports copied paths; commit success also reports staged paths,
     commit SHA, and effective commit message.
3. Guard elements:
   - repo mismatch, target checkout branch/state, path safety, target conflict,
     and staged-scope exactness are fail-closed guards.
   - selected-path diagnostics are audit evidence, not permission to infer
     additional paths.
4. Compat-only elements:
   - CLI text/help is an operator read model over the typed result contract.
   - docs examples are illustrative and must not become alternate routing
     authority.
5. Forbidden reinterpretations:
   - Do not describe extract as bubble merge, approve, commit, delete, or close.
   - Do not broaden extract to non-ideation bubbles or product/runtime source
     paths.
   - Do not imply overwrite, glob, directory extraction, or inferred changed-file
     selection exists in v1.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `tests/cli/bubbleExtractCommand.test.ts`
   - `tests/cli/index.test.ts`
   - `src/v11/application/extract/extractCommandContract.ts`
   - `src/v11/application/extract/emitExtractV11.ts`
   - `README.md`
   - `docs/README.md`
   - `docs/llm-doc-workflow-v1.md`
2. Actual touched scope: docs/operator read model plus targeted validation
   coverage for the already-implemented extract command.
3. Mutation entrypoints in scope: test-created temporary repositories only. No
   product/runtime mutation entrypoint or source-bubble lifecycle command is in
   scope.
4. Hidden scope ruled out: runtime command contract, path validator, transfer,
   selected-path commit implementation, overwrite behavior, glob support, and
   lifecycle cleanup are not part of this task.
5. Branch inventory note: tests must cover success, multi-path, forbidden path,
   target conflict, repo mismatch, non-main target checkout, dirty target
   checkout, staged-scope mismatch, selected-path commit result, and source
   lifecycle non-mutation.
6. Why the declared task shape matches reality: the remaining plan gap is
   operator discoverability and regression proof, and it can be closed by docs
   plus tests without changing extract runtime source.

### Authority Boundary Map

1. Authority producer: tasks 1-3 and the current extract source modules produce
   the runtime authority.
2. Stored authority: TypeScript source/tests plus operator docs; no persisted
   runtime schema is introduced here.
3. In-scope consumers: README/operator docs, CLI help/read-model tests, and
   targeted CLI/application regression tests.
4. Explicit out-of-scope consumers: UI surfaces, runtime implementation modules,
   bubble lifecycle commands, archive/cleanup workflows, and non-ideation
   extraction contracts.
5. Export surfaces closed in this phase: yes, operator documentation and final
   validation evidence for the v1 CLI path.

### Baseline Preservation

1. Must-preserve behaviors:
   - existing `bubble extract` parser/help options from task 1.
   - path selection safety and no-overwrite behavior from task 2.
   - copy/commit success and failure result contract from task 3.
   - normal bubble `approve -> commit -> merge` lifecycle remains separate.
2. Allowed resolution paths:
   - use CLI/application entrypoints for behavior tests.
   - use temporary repositories and existing test helpers for git-state proof.
   - use docs examples that match the current CLI help and typed result
     contract.
3. Forbidden regression interpretations:
   - failing docs/tests must not be "fixed" by editing runtime source in this
     task.
   - docs must not turn examples into glob support, overwrite support, or cleanup
     automation.
4. Replacement proof required if removed: if existing extract tests are renamed
   or reorganized, equivalent coverage for every required branch must remain
   visible in targeted test output.

### Success / Completion Proof Boundary

1. Current canonical success proof source: task 3 provides runtime success result
   fields and targeted transfer/commit tests.
2. Target canonical success proof source: final docs plus targeted tests prove
   the operator-visible extract capability across success, failure, commit, and
   lifecycle boundary cases.
3. Current canonical completion proof source: parent plan remains open with
   docs/final validation missing.
4. Target canonical completion proof source: this task's validation evidence
   plus normal Pairflow task close/archive aftermath.
5. Reused proof contract: CLI parser/help tests and temporary git-repository
   flow tests.
6. Proof-parity rule: `narrowed_here_with_proof`.
7. Final truth surfaces affected: README/docs text, CLI help assertions, JSON
   result assertions, selected-path commit evidence assertions.
8. Mixed-truth surfaces allowed: none; typed results remain canonical and docs
   are read-model mirrors only.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `activation_or_read_model`.
2. Secondary shape: `consumer_family_alignment`, limited to final test coverage
   over the same CLI/application extract path.
3. Preconditions that must pass before side effects: test fixtures must create
   isolated temporary repositories and ideation bubbles before invoking extract
   success or commit cases.
4. Side effects forbidden before preconditions pass: no writes to the developer
   checkout except docs/test file edits; no source-bubble lifecycle commands in
   extract tests except fixture setup/inspection.
5. Invalid/precondition-failure behavior: targeted tests must assert structured
   fail-closed results and no source-bubble lifecycle mutation.
6. Coordination primitives in scope: N/A.

### In Scope

1. Add operator documentation for `pairflow bubble extract`, including command
   syntax, `--repo`, repeated `--path`, optional `--commit`, optional
   `--message`, JSON/text result expectations, and post-extract cleanup guidance.
2. State explicitly that v1 accepts only repo-relative files under `plans/**`,
   `docs/**`, or `progress/**`, with no glob, directory, overwrite, or product
   source extraction support.
3. Add or tighten targeted tests for copy-only success and multi-path success.
4. Add or tighten targeted tests for forbidden path, target conflict, repo
   mismatch, non-main target checkout, and dirty target checkout.
5. Add or tighten targeted tests for staged-scope exactness and selected-path
   commit result fields: `stagedPaths`, `commitSha`, and `commitMessage`.
6. Add or tighten targeted tests proving source-bubble lifecycle state/artifacts
   are not deleted, approved, committed, merged, closed, or otherwise mutated by
   extract on success or failure.
7. Run the final validation commands required by the parent plan and record any
   failures exactly.

### Out of Scope

1. Runtime/product source changes under `src/**`.
2. New extract behavior, new flags, overwrite/replace support, glob support, or
   directory extraction.
3. Extraction from non-ideation implementation/code bubbles.
4. Source-bubble cleanup automation or integration with `bubble approve`,
   `bubble commit`, `bubble merge`, or `bubble delete`.
5. UI changes, remote-bubble support changes, or archive workflow changes.

### Safety Defaults

1. Documentation must describe fail-closed behavior as the default for ambiguous,
   missing, unsafe, conflicting, dirty, non-main, or mismatched inputs.
2. Tests must use isolated temporary repositories and must not depend on the
   developer checkout state.
3. Any discovered runtime defect is a blocker or follow-up implementation task,
   not a reason to edit product source inside this docs/validation task.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. This task mirrors and validates existing CLI/result contracts; it does not
   change DB, API, event, auth, config, or runtime interface contracts.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A
10. Identity/join note:
    - canonical identity path: bubble metadata `repo_path`, resolved target
      repo path, and explicit selected repo-relative paths.
    - competing identifiers or fallback identities: cwd-only guesses, git
      status paths, transcript/prose references, source worktree paths, and
      lifecycle state are forbidden as transfer identity.
11. Authority/source-of-truth note:
    - canonical source: tasks 1-3 plus current extract source modules and typed
      result contract.
    - forbidden secondary sources: docs examples, stale README prose, shell glob
      expansion, and unrelated staged files.
12. Closure-budget triage:
    - closure buckets touched: `read_model_consumers`,
      `workflow_orchestration_consumers`, `internal_execution_consumers` through
      tests only.
    - intentionally collapsed closures: docs and tests are collapsed because
      both validate the same final operator-visible CLI capability.
    - explicitly deferred closures: runtime behavior changes, overwrite/glob
      support, non-ideation extraction, cleanup automation, UI surfaces.
13. Bounded-task-shape decision:
    - primary shape: `activation_or_read_model`
    - secondary shape: `consumer_family_alignment`
    - why this bounded mix is safe: no runtime source mutation is allowed; tests
      consume already-closed behavior and docs mirror the same operator path.
14. Contract-dense decision:
    - gate triggered: `yes`
    - trigger reasons: result shape, failure taxonomy, fallback/precondition
      behavior, lifecycle split ownership, mirrored docs/tests surfaces.
    - canonical matrix source: L1 `Canonical Validation Matrix`.
    - mirrored surfaces: L0 domain summary, docs requirements, acceptance
      criteria, validation strategy, and targeted tests.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Only explicit selected ideation artifacts move to `main`. | Docs/tests must reject inferred paths, overwrite, hidden merge, and lifecycle cleanup. | P1 | required-now |
| Control model | Runtime authority is tasks 1-3; current task is docs/read-model and validation only. | Do not edit runtime source; route defects to follow-up implementation work. | P1 | required-now |
| Read-path rule | Tests exercise CLI/application entrypoints and docs mirror typed results. | Avoid prose-only validation; assert actual behavior. | P1 | required-now |
| Forbidden fallback | No git-status, glob, transcript, directory, or all-changed-files inference. | Docs and tests must name forbidden sources explicitly. | P1 | required-now |
| Allowed resolution path | `--repo` or cwd target resolution, repo metadata match, explicit file paths, clean `main`, no target conflict, copy, optional selected-path commit. | Operator docs and tests must cover the complete path. | P1 | required-now |
| Missing-data rule | Missing or unsafe inputs fail closed before writes/commit and never mutate source lifecycle. | Failure tests must assert no source lifecycle mutation. | P1 | required-now |
| Phase boundary | Final docs and validation only. | Product/runtime source changes are out of scope. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Ideation eligibility | task 1, `extractCommandContract.ts` | `[ideation] mode=true` is required; `task_pending` is not eligibility. | Document and test where relevant. | P1 | required-now |
| Explicit selected paths | task 2, `extractPathSelection.ts` | repeated `--path` is the only path authority. | Document and regression-test multi-path/forbidden path cases. | P1 | required-now |
| Allowed roots | task 2 | v1 roots are `plans/**`, `docs/**`, `progress/**`. | Document; assert forbidden product/source path failure. | P1 | required-now |
| Target conflict | task 2 | existing target path fails closed; no overwrite. | Document and test. | P1 | required-now |
| Copy success | task 3, `extractTransfer.ts` | success includes selected copied path evidence. | Test and document text/JSON expectations. | P1 | required-now |
| Commit success | task 3, `extractCommit.ts` / result type | commit success includes exact staged paths, commit SHA, and effective message. | Test selected-path commit result. | P1 | required-now |
| Lifecycle boundary | parent plan, tasks 1 and 3 | extract does not approve, commit, merge, delete, close, or cleanup source bubble. | Document and test source lifecycle non-mutation. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | `bubbleExtractCommand.test.ts`, `index.test.ts`, extract app modules, README/docs. | Tests should extend existing extract test surface unless a narrower test file is justified. | P1 | required-now |
| Actual touched scope | docs/operator read model plus validation tests. | No `src/**` edits in this task. | P1 | required-now |
| Mutation entrypoints in scope | isolated temporary git repos in tests only. | Test fixture side effects must stay under temp dirs. | P1 | required-now |
| Hidden scope ruled out | runtime behavior and lifecycle cleanup are already separate contracts. | Do not add behavior to satisfy docs/tests. | P1 | required-now |
| Branch inventory note | success, multi-path, forbidden path, target conflict, repo mismatch, non-main/dirty checkout, staged-scope, commit result, lifecycle non-mutation. | Every branch must appear in targeted tests or explicit validation evidence. | P1 | required-now |
| Shape proof | final plan gap is discoverability/regression proof after implementation. | Single docs/validation task remains bounded. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Operator workflow is undocumented and regression-prone. | Add docs and final targeted coverage. | P1 | required-now |
| Depends on | `3-extract-copy-commit` archived, with tasks 1-2 archived before it. | Do not start before runtime behavior is settled. | P1 | required-now |
| Unlocks / impacts successors | N/A | This is the final planned slice. | P2 | required-now |
| Task-list impact | Create `4-extract-docs-validation` only. | No task supersession. | P1 | required-now |
| Inherited validation / exit expectation | Parent validation strategy plus final task branch list. | Run targeted tests and full verification order unless blocked. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `ExtractCommandResult` success/failure fields | CLI text renderer, JSON output, tests, operator docs | N/A | Validate and document existing fields only. | N/A |
| CLI help/operator syntax | CLI parser/help, README/docs, tests | additive docs/read-model only | Add documentation and assertions without changing flags. | N/A |
| Bubble lifecycle boundary | existing lifecycle commands and operator workflow | N/A | Validate no extract lifecycle mutation. | N/A |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| `bubble extract --path` requires explicit paths. | preserve | parser/help and multi-path tests. | P1 | required-now |
| forbidden paths and globs fail closed. | preserve | targeted failure assertions. | P1 | required-now |
| target conflict fails closed. | preserve | targeted target-exists test. | P1 | required-now |
| repo mismatch fails closed. | preserve | targeted repo mismatch test. | P1 | required-now |
| non-main/dirty target checkout fails closed. | preserve | targeted checkout-state tests. | P1 | required-now |
| selected-path commit result fields. | preserve | commit-mode test asserts staged paths, SHA, and message. | P1 | required-now |
| source-bubble lifecycle non-mutation. | preserve | success/failure tests inspect source bubble artifacts/state. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| CLI JSON result | task 3 result type/tests | final targeted tests | canonical | no | P1 | required-now |
| CLI text output | task 3 renderer/tests | docs plus CLI text assertions | read-model | no | P1 | required-now |
| Operator docs | parent plan only | README/docs update | read-model | no | P1 | required-now |
| Plan completion evidence | archived tasks 1-3 | this task validation output and close/archive aftermath | guard | no | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority |
|---|---|---|---|---|
| repo mismatch | target path copy or git stage | target writes, staging, commit, source lifecycle mutation | structured failure, zero extract side effects | P1 |
| forbidden path | source read/copy or git stage | target writes, staging, commit, source lifecycle mutation | structured failure, zero extract side effects | P1 |
| target conflict | copy or commit | overwrite, staging, commit, source lifecycle mutation | structured failure, no overwrite | P1 |
| non-main/dirty checkout | path selection, copy, or commit | target writes, staging, commit, source lifecycle mutation | structured checkout failure | P1 |
| staged-scope mismatch | commit creation | target commit, source lifecycle mutation | structured failure with mismatch diagnostics | P1 |

### 0h) Canonical Validation Matrix

| ID | Condition / Input | Owner | Output / Status | Reason / Error Code | Retained / Dropped Data | Side Effects | Required Test |
|---|---|---|---|---|---|---|---|
| CVM1 | valid ideation bubble, one selected docs/plans/progress path, no `--commit` | current task validates | success with copied path evidence | N/A | selected/copy evidence retained | selected target file copied only | T1 |
| CVM2 | valid ideation bubble, multiple selected paths | current task validates | success preserves explicit selected order | N/A | selected/copy evidence retained in order | selected target files copied only | T2 |
| CVM3 | selected path outside allowed roots or glob/directory pattern | upstream behavior, current task validates | failed before copy/stage/commit | `EXTRACT_PATH_SCOPE_FORBIDDEN` or `EXTRACT_PATH_GLOB_UNSUPPORTED` / unsafe reason | diagnostics retained | none | T3 |
| CVM4 | selected target already exists on `main` | upstream behavior, current task validates | failed before copy/stage/commit | `EXTRACT_TARGET_PATH_EXISTS` | conflict diagnostics retained | no overwrite | T4 |
| CVM5 | resolved target repo disagrees with bubble metadata repo | upstream behavior, current task validates | failed before path validation/copy/stage/commit | `EXTRACT_REPO_MISMATCH` | repo diagnostics retained | none | T5 |
| CVM6 | target checkout on non-`main` branch | upstream behavior, current task validates | failed before path validation/copy/stage/commit | `EXTRACT_TARGET_CHECKOUT_INVALID` with `non_main_branch` | checkout diagnostics retained | none | T6 |
| CVM7 | target checkout dirty | upstream behavior, current task validates | failed before path validation/copy/stage/commit | `EXTRACT_TARGET_CHECKOUT_INVALID` with `dirty_worktree` | checkout diagnostics retained | none | T7 |
| CVM8 | staged paths differ from normalized selected paths in commit mode | task 3 behavior, current task validates | failed before commit creation | `EXTRACT_STAGED_SCOPE_MISMATCH` | expected and actual staged paths retained | copied/selected staged paths may remain; no commit | T8 |
| CVM9 | commit mode succeeds | task 3 behavior, current task validates | success with `stagedPaths`, `commitSha`, `commitMessage` | N/A | commit evidence retained | selected target files committed only | T9 |
| CVM10 | extract succeeds or fails | cross-cutting lifecycle boundary | source bubble remains open/present and lifecycle state/artifacts are not mutated by extract | N/A or existing failure reason | source lifecycle proof retained in test fixture | no approve/commit/merge/delete/close on source bubble | T10 |

### 0i) Ownership and Deferred Semantics

| Surface / Decision | Owned By This Task | Emits / Records Only | Deferred Owner | Forbidden Interpretation / Fallback | Priority | Timing |
|---|---|---|---|---|---|---|
| Operator documentation | yes | N/A | N/A | Docs must not define behavior that runtime contract lacks. | P1 | required-now |
| Final validation matrix | yes | validation evidence | N/A | Passing narrow tests alone must not hide skipped required branches. | P1 | required-now |
| Runtime extract implementation | no | tests may reveal defects | follow-up implementation task if needed | Do not edit product source in this task. | P1 | required-now |
| Source-bubble cleanup | no | non-mutation evidence only | existing lifecycle commands | Extract success must not imply cleanup. | P1 | required-now |

### 0j) Structured Contract Rules

| Structured Contract | Required Fields | Optional Fields | Allowed Top-Level Fields / Variants | Unknown / Malformed / Duplicate Behavior | Retention / Drop Rule | Fallback Status / Reason | Priority | Timing |
|---|---|---|---|---|---|---|---|---|
| copy-only success result | `status`, `bubbleId`, `repoPath`, `paths`, `commitRequested`, `selectedPaths`, `copiedPaths` | `diagnostics`, `message` | success result only | malformed input fails before success | retain selected/copy evidence | N/A | P1 | required-now |
| commit success result | copy-only fields plus `stagedPaths`, `commitSha`, `commitMessage` | `diagnostics`, `message` | success result only | staged mismatch fails before commit | retain selected/staged/commit evidence | N/A | P1 | required-now |
| failed result | `status`, `bubbleId`, `repoPath`, `paths`, `commitRequested`, `reasonCode` | `diagnostics`, `message` | failure result only | missing/unsafe/conflicting/mismatched inputs fail closed | retain diagnostics needed for operator/test proof | matching `EXTRACT_*` reason | P1 | required-now |

### 0k) Mirrored Surface Checklist

| Canonical Matrix Row | Mirrored Surfaces | Required Alignment Rule | Summary-Only Surface? | Verification |
|---|---|---|---|---|
| CVM1-CVM2 | README/docs examples, acceptance criteria, tests | examples must use explicit repo-relative files and no cleanup claim | docs yes | T1-T2 |
| CVM3-CVM7 | docs failure guidance, acceptance criteria, tests | fail-closed wording must match reason family and pre-side-effect boundary | docs yes | T3-T7 |
| CVM8-CVM9 | docs commit-mode guidance, tests | commit docs must say selected paths only and name result evidence | docs yes | T8-T9 |
| CVM10 | docs cleanup guidance, tests | docs must direct cleanup to existing lifecycle commands only | docs yes | T10 |

### 1) Documentation Contract

1. Add an operator-facing section to the most appropriate existing docs surface
   for `pairflow bubble extract`.
2. Include command forms:
   - `pairflow bubble extract --id <id> --path <path> [--path <path>...] [--repo <path>]`
   - `pairflow bubble extract --id <id> --path <path> --commit [--message <text>] [--json]`
3. Explain that `--path` is repeated, explicit, repo-relative, and limited to
   files under `plans/**`, `docs/**`, or `progress/**`.
4. Explain that `--repo` selects the target repository when supplied; otherwise
   cwd ancestry is used; the resolved target must match bubble metadata.
5. Explain that the target checkout must be clean, on `main`, and free of
   merge/rebase/cherry-pick state.
6. Explain that existing target files fail closed; no overwrite/replace mode
   exists in v1.
7. Explain that `--commit` stages and commits exactly selected paths and reports
   selected paths, staged paths, commit SHA, and effective message.
8. Explain that extract never approves, commits, merges, deletes, closes, or
   otherwise mutates the source bubble lifecycle; operators use existing
   lifecycle commands separately after extraction.

### 2) Test Contract

1. Use existing extract test files where practical:
   - `tests/cli/bubbleExtractCommand.test.ts`
   - `tests/cli/index.test.ts`
2. Add focused tests for all `Canonical Validation Matrix` rows T1-T10.
3. Tests must use temporary repositories or dependency stubs so they do not
   depend on current developer checkout branch, staged files, or filesystem
   state.
4. Tests for lifecycle non-mutation must inspect the source bubble fixture before
   and after extract and prove extract did not call or simulate
   approve/commit/merge/delete/close behavior.
5. Tests for staged-scope safety must prove a mismatch fails before commit and
   that a success commit contains only selected normalized paths.
6. Tests for docs/help must assert operator-visible wording does not advertise
   cleanup, glob, overwrite, or inferred changed-file support.

### 3) Acceptance Criteria

1. Operator docs describe the extract workflow, constraints, failure defaults,
   commit mode, and separate cleanup/lifecycle boundary.
2. Copy-only success is covered by targeted tests through the real
   CLI/application path.
3. Multi-path success is covered and preserves explicit selected-path order.
4. Forbidden path behavior is covered for out-of-scope or glob-like selection.
5. Target conflict behavior is covered and proves no overwrite.
6. Repo mismatch behavior is covered and fails before copy/stage/commit.
7. Non-main target checkout behavior is covered and fails before
   copy/stage/commit.
8. Dirty target checkout behavior is covered and fails before copy/stage/commit.
9. Staged-scope mismatch behavior is covered and fails before commit.
10. Selected-path commit success result is covered, including `stagedPaths`,
    `commitSha`, and `commitMessage`.
11. Source-bubble lifecycle non-mutation is covered on at least one success path
    and one fail-closed path.
12. No product/runtime source files are changed by this task.

## L2 - Implementation Notes

1. Prefer updating existing operator docs rather than adding a new standalone
   document unless the existing docs structure clearly lacks a suitable home.
2. Keep examples short and executable; avoid describing unsupported future
   behavior.
3. Prefer extending existing extract tests to preserve local context and avoid
   duplicate fixture setup.
4. If a new helper is needed for tests, keep it under `tests/**`; do not add
   helper code under `src/**` in this task.
5. If targeted tests reveal that current runtime behavior does not satisfy the
   closed task 1-3 contract, stop and report the exact failing command/test as a
   blocker for a follow-up implementation task.
6. Keep docs and tests aligned with the `Canonical Validation Matrix`; if a
   matrix row changes during review, update all mirrored surfaces named above.

## Validation Strategy

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. Targeted tests:
   - `pnpm vitest run tests/cli/bubbleExtractCommand.test.ts`
   - `pnpm vitest run tests/cli/index.test.ts`
5. Broader affected suite: N/A unless the implementation touches additional
   test/doc surfaces.
6. `pnpm test`
7. `pnpm build`
