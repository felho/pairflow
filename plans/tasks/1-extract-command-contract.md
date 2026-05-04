---
artifact_type: task
artifact_id: task_extract_command_contract_v1
task_family_id: extract-command-contract
sequence_key: "1"
task_id: 1-extract-command-contract
title: "Extract Command Contract"
status: in_progress
phase: phase1
target_files:
  - src/v11/application/extract/extractCliCommand.ts
  - src/v11/application/extract/extractCommandContract.ts
  - src/v11/application/extract/extractCommandPreconditions.ts
  - src/v11/application/extract/extractCommandDefaults.ts
  - src/v11/application/extract/emitExtractV11.ts
  - src/cli/commands/bubble/extract.ts
  - src/cli/index.ts
  - src/index.ts
  - tests/cli/bubbleExtractCommand.test.ts
  - tests/cli/index.test.ts
prd_ref: null
plan_ref: plans/ideation-bubble-extract-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/ideation-bubble-extract-plan-v1.md
  - docs/pairflow-initial-design.md
  - src/v11/application/create/createCliOptions.ts
  - src/v11/domain/ideation/ideationMetadata.ts
  - src/v11/shared/ports/bubbleLookup.ts
  - src/v11/application/commit/commitCliCommand.ts
  - src/v11/application/delete/deleteCliCommand.ts
owners:
  - "felho"
doc_bubble_id: 1-extract-command-contract-doc
impl_bubble_id: 1-extract-command-contract-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-04-ideation-bubble-extract-plan-v1
---

# Task: Extract Command Contract

## L0 - Policy

### Goal

Create the first-class `pairflow bubble extract` command contract for promoting
explicitly selected ideation artifacts from a bubble worktree into the main
checkout, without implementing path transfer or git commit execution yet.

This task owns the CLI shape, typed result/failure contract, ideation
eligibility rule, target repository resolution rule, target checkout
precondition contract, and source-bubble lifecycle boundary that successor
tasks must consume.

### Domain / Control Model Summary

1. Business invariant: only explicitly selected ideation artifacts may move to
   `main`; unrelated bubble changes must not leak into the main checkout.
2. Control model: bubble metadata decides ideation eligibility; repeated
   `--path` arguments decide the only candidate files; target repository
   resolution and checkout preconditions decide whether later write/commit work
   may proceed.
3. Read-path rule: this task may read bubble metadata via the existing bubble
   lookup authority and may read target repository state for precondition
   checks; it must not read file contents for extraction.
4. Forbidden fallback: do not infer paths from git status, glob expansion,
   transcript refs, agent prose, or "all changed files"; do not treat
   `ideation.task_pending` as extract eligibility.
5. Allowed resolution path: `--repo <path>` wins when supplied; otherwise use
   the same cwd ancestry convention as existing bubble commands; the resolved
   target repo must match the resolved bubble metadata `repoPath`.
6. Missing-data rule: missing `--id`, missing `--path`, missing bubble,
   missing/invalid ideation metadata, unresolved target repo, repo mismatch,
   message supplied without commit intent, or invalid target checkout
   precondition must fail closed before any write, staging, commit, or
   source-bubble lifecycle mutation.
7. Phase boundary:
   - contract closure: owned here for command name, flags, result shape, and
     failure reason taxonomy.
   - producer closure: owned here only for producing a validated command
     contract/precondition result; no artifact copy.
   - internal execution closure: deferred to path validation and copy/commit
     tasks.
   - workflow/orchestration closure: owned here only for CLI registration/help.
   - read-model closure: owned here only for CLI text/JSON result rendering.
   - activation closure: foundation only; end-to-end extraction closes in the
     final docs/validation task after transfer implementation exists.
   - cleanup/recovery closure: explicitly out of scope; existing bubble
     lifecycle commands remain the only cleanup path.

### Plan Linkage

1. Parent plan gap closed: no official command contract exists for
   `pairflow bubble extract`.
2. Depends on: approved parent plan only.
3. Unlocks / impacts successors:
   - `2-extract-path-selection` consumes the repeated `--path` parse contract
     and failure taxonomy.
   - `3-extract-copy-commit` consumes target repo/checkout preconditions and
     selected-path commit authority.
   - `4-extract-docs-validation` consumes the final CLI help/result wording.
4. Task-list impact: refines planned task `1-extract-command-contract`; it does
   not replace or obsolete any task id.
5. Inherited validation / exit expectation: parser/help tests and CLI
   registration tests must prove the command contract, while valid extraction
   execution remains incomplete until successor tasks.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/application/create/createCliOptions.ts`
   - `src/v11/domain/ideation/ideationMetadata.ts`
   - `src/v11/shared/ports/bubbleLookup.ts`
   - `src/v11/application/commit/commitCliCommand.ts`
   - `src/v11/application/delete/deleteCliCommand.ts`
   - `src/cli/index.ts`
   - `docs/pairflow-initial-design.md`
2. Canonical elements:
   - `--ideation` persists `[ideation] mode = true`.
   - `ideation.task_pending` is kickoff state, not extract eligibility.
   - `ResolveBubbleByIdPort` is the bubble lookup authority and returns the
     resolved bubble `repoPath`.
   - Normal bubble full integration remains `approve -> commit -> merge`.
3. Guard elements:
   - target repo state, current branch, dirty state, detached HEAD, and
     merge/rebase/cherry-pick state are precondition guards for later writes.
   - selected paths are parsed here but fully normalized/validated in
     `2-extract-path-selection`.
   - no-overwrite is a v1 contract rule named here, but target conflict
     detection is implemented by `2-extract-path-selection`.
4. Compat-only elements: existing `bubble delete` and `bubble commit` CLI
   wording are comparison anchors only; this task must not call those commands.
5. Forbidden reinterpretations:
   - Do not add `--delete-bubble` or any cleanup alias.
   - Do not make `--commit` mean `pairflow bubble commit`.
   - Do not broaden extract to non-ideation bubbles.
   - Do not allow a successful contract/precondition result to imply that files
     were copied.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/cli/index.ts`
   - `src/v11/application/commit/commitCliCommand.ts`
   - `src/v11/application/delete/deleteCliCommand.ts`
   - `src/v11/application/list/listCliCommand.ts`
   - `src/v11/domain/ideation/ideationMetadata.ts`
   - `src/v11/shared/ports/bubbleLookup.ts`
   - `tests/cli/bubbleCommitCommand.test.ts`
   - `tests/cli/index.test.ts`
2. Actual touched scope: contract foundation plus CLI activation for parser/help
   and typed failure/result surfaces.
3. Mutation entrypoints in scope: `runCli` command dispatch only. No filesystem
   copy, git add, git commit, bubble state write, bubble delete, or lifecycle
   mutation is in scope.
4. Hidden scope ruled out: path normalization/allowlist details, source file
   existence, target conflict detection, file copy, selected-path staging, git
   commit, docs, and end-to-end flow tests are successor scopes.
5. Branch inventory note: parse/help branches, missing required option branches,
   ideation eligible/ineligible branches, repo match/mismatch branches, target
   checkout precondition pass/fail branches, and execution-not-yet-available
   branches must be represented.
6. Why the declared task shape matches reality: the first task establishes a
   shared command contract consumed by three successor tasks and can be proven
   with parser/help/contract tests without moving files.

### Authority Boundary Map

1. Authority producer: this task produces the typed `bubble extract` command
   contract and reason-code taxonomy.
2. Stored authority: TypeScript source modules and tests; no persisted runtime
   authority is introduced.
3. In-scope consumers: CLI parser/dispatcher, help renderer, result renderer,
   and successor task contracts.
4. Explicit out-of-scope consumers: file transfer, path allowlist enforcement,
   source content readers, git staging/commit execution, UI surfaces, and
   bubble delete/cleanup.
5. Export surfaces closed in this phase: yes, the TypeScript command contract
   and CLI help/parse surface are closed; the end-to-end extract capability is
   not closed.

### Baseline Preservation

1. Must-preserve behaviors:
   - Existing `bubble create --ideation` metadata semantics remain unchanged.
   - Existing `bubble commit` lifecycle command remains scoped to committing a
     bubble branch/worktree and is not reused as extract commit authority.
   - Existing `bubble delete` confirmation/force behavior remains separate.
   - Existing unknown command behavior remains intact except that `bubble
     extract` becomes a supported subcommand.
2. Allowed resolution paths:
   - Use `ResolveBubbleByIdPort` for bubble lookup and repo-path comparison.
   - Use existing git/cwd repository resolution conventions used by other
     bubble commands.
3. Forbidden regression interpretations:
   - Do not make missing target repo fall back to the source bubble worktree.
   - Do not turn `--path` into positional arguments or glob patterns.
   - Do not make `--commit` stage or commit anything in this task.
4. Replacement proof required if removed: any changed CLI dispatch behavior
   must keep all existing bubble subcommands discoverable and tested.

### Success / Completion Proof Boundary

1. Current canonical success proof source: N/A; no extract command exists.
2. Target canonical success proof source: parser/help/contract tests prove the
   command contract and fail-closed precondition taxonomy exist.
3. Current canonical completion proof source: N/A; no mutable flow exists.
4. Target canonical completion proof source: N/A; this is not end-to-end
   extraction completion.
5. Reused proof contract: existing CLI command parse/help test pattern.
6. Proof-parity rule: `narrowed_here_with_proof`.
7. Final truth surfaces affected: CLI help text, parsed option type,
   structured result/failure type, supported command list.
8. Mixed-truth surfaces allowed: none; result text/JSON must not claim copied
   files or committed SHA before successor implementation exists.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `contract_or_persisted_authority_foundation`.
2. Secondary shape: `activation_or_read_model`, limited to CLI help/dispatch
   surface.
3. Preconditions that must pass before side effects:
   - `--id` present.
   - at least one repeated `--path` present.
   - bubble resolves exactly.
   - bubble has `ideation.mode=true` and no ideation parse warning.
   - resolved target repo matches bubble metadata `repoPath`.
   - target checkout precondition contract evaluates before successor writes.
4. Side effects forbidden before preconditions pass: file copy, directory
   creation for selected artifacts, git staging, git commit, source-bubble state
   writes, source-bubble delete/cleanup.
5. Invalid/precondition-failure behavior: zero side effects with structured
   failure reason.
6. Coordination primitives in scope: N/A.

### In Scope

1. Add `pairflow bubble extract` parse/help contract with `--id`, repeated
   `--path`, optional `--repo`, optional `--message`, optional `--commit`,
   optional `--json`, and `--help`.
2. Define typed command options where `paths` is a non-empty explicit list.
3. Define typed result/failure contracts for contract/precondition execution.
4. Define canonical failure reason codes for missing id/path, missing bubble,
   unresolved target repo, non-ideation bubble, ideation metadata parse warning,
   repo mismatch, message supplied without commit intent, target checkout
   precondition failure, and implementation-deferred execution.
5. Register/export the command surface consistently with existing CLI command
   patterns when doing so does not imply file transfer is complete.
6. Add targeted parser/help/dispatch tests for the command contract.

### Out of Scope

1. Path normalization, allowlist enforcement, source existence checks, and
   target conflict detection beyond naming the contract consumed by task 2.
2. Copying files from the bubble worktree.
3. Staging or committing selected paths on `main`.
4. Running `pairflow bubble commit`, `approve`, `merge`, `delete`, or any
   source-bubble lifecycle mutation.
5. Glob support, overwrite/replace, interactive diff UI, and non-ideation
   bubble extraction.

### Safety Defaults

1. Unknown or missing data fails closed with zero side effects.
2. `--path` is repeatable and explicit; no positional or glob path contract is
   accepted.
3. `--commit` is only an intent/authority flag in this task; execution is
   successor scope.
4. Source bubble lifecycle is preserved on every branch.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - CLI command contract: new `pairflow bubble extract` command.
   - Structured result contract: new extract result/failure shape and reason
     taxonomy.
   - No DB, event, auth, or config contract changes.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`, as the parent plan already split transfer,
   commit, and docs/validation into successors.
9. If `no`, required split: N/A.
10. Identity/join note:
   - canonical identity path: `--id` resolves through `ResolveBubbleByIdPort`.
   - competing identifiers or fallback identities: cwd ancestry and `--repo`
     may locate the target repo, but must not override resolved bubble
     metadata.
11. Authority/source-of-truth note:
   - canonical source: bubble metadata plus explicit CLI options.
   - forbidden secondary sources: git status, transcript refs, prose, glob
     expansion, all changed files.
12. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `workflow_orchestration_consumers`,
     `activation_or_read_model`.
   - intentionally collapsed closures: CLI parse/help/dispatch are collapsed
     because they share the same command entrypoint and do not perform transfer
     side effects.
   - explicitly deferred closures: path validation, file transfer, git commit,
     docs/final proof, cleanup/recovery.
13. Bounded-task-shape decision:
   - primary shape: `contract_or_persisted_authority_foundation`.
   - secondary shape: `activation_or_read_model`.
   - why this bounded mix is safe: CLI help/dispatch is needed to prove the
     command contract, but valid extraction execution remains fail-closed or
     implementation-deferred until successor tasks.
14. Contract-dense decision:
   - gate triggered: `yes`
   - trigger reasons: API/result shape, structured input parsing, failure
     reason-code behavior, downstream consumers, mirrored surfaces.
   - canonical matrix source: L1 section `0h`.
   - mirrored surfaces: L0 control summary, L1 domain contract, L1 structured
     contract rules, L1 tests.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Only explicitly selected ideation artifacts may later move to `main`. | Parser and contract must require repeated explicit `--path`; no "all changed" or inferred path mode. | P1 | required-now |
| Control model | Bubble metadata controls extract eligibility; CLI path list controls candidates; target repo state controls write permission. | Contract modules must preserve these as separate authority inputs. | P1 | required-now |
| Read-path rule | This task may read command args, bubble metadata, and target repo state only. | Do not read selected file contents or copy files. | P1 | required-now |
| Forbidden fallback | No glob, positional path, git-status path inference, transcript/prose path inference, or non-ideation fallback. | Unknown/missing data becomes structured failure. | P1 | required-now |
| Allowed resolution path | `--repo` wins; otherwise cwd ancestry; resolved target repo must equal resolved bubble `repoPath`. | Add contract/precondition code and tests for repo match/mismatch. | P1 | required-now |
| Missing-data rule | Missing/invalid id/path/bubble/ideation/repo/commit-message intent/precondition fails with zero side effects. | Result taxonomy must include fail-closed reasons. | P1 | required-now |
| Phase boundary | Own command contract only; defer path validation, copy, commit execution, and docs/final proof. | Valid command execution must not claim end-to-end extraction. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `ideation.mode` | `src/v11/domain/ideation/ideationMetadata.ts` | `true` means the bubble is ideation-eligible. | Preserve and consume for eligibility. | P1 | required-now |
| `ideation.task_pending` | `src/v11/domain/ideation/ideationMetadata.ts` | Kickoff state only, not extract eligibility. | Explicitly ignore for eligibility. | P1 | required-now |
| `ResolveBubbleByIdPort.repoPath` | `src/v11/shared/ports/bubbleLookup.ts` | Resolved bubble repository authority. | Compare to target repo resolution; fail on mismatch. | P1 | required-now |
| `bubble commit` lifecycle | `src/v11/application/commit/commitCliCommand.ts` | Commits bubble worktree lifecycle state, not extract-selected main paths. | Do not call or reinterpret. | P1 | required-now |
| `bubble delete` lifecycle | `src/v11/application/delete/deleteCliCommand.ts` | Separate confirmation/force cleanup command. | Do not expose extract cleanup flags. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Existing CLI command modules and `src/cli/index.ts` define command wiring pattern. | Implement extract with matching parse/help/export style. | P1 | required-now |
| Actual touched scope | Contract foundation plus CLI help/dispatch. | Do not include copy/commit implementation. | P1 | required-now |
| Mutation entrypoints in scope | `runCli` dispatch only. | Dispatch must not perform file/git/bubble lifecycle mutation in this task. | P1 | required-now |
| Hidden scope ruled out | Transfer, staging, commit, delete, and docs are successor tasks. | Tests must avoid claiming those are complete. | P1 | required-now |
| Branch inventory note | parse/help, missing id/path, eligibility pass/fail, repo match/mismatch, implementation-deferred. | Each required branch gets targeted contract/parser coverage. | P1 | required-now |
| Shape proof | The command contract can be proven without moving files. | Keep the task as foundation plus minimal activation surface. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | `1-extract-command-contract` closes missing command contract. | Create command/result/precondition contract. | P1 | required-now |
| Depends on | Parent plan only. | No predecessor task assumptions. | P1 | required-now |
| Unlocks / impacts successors | Tasks 2, 3, and 4 inherit flags, reason codes, and result shape. | Do not leave core option names or result fields ambiguous. | P1 | required-now |
| Task-list impact | Refines planned task `1-extract-command-contract`. | No plan split or task replacement. | P1 | required-now |
| Inherited validation / exit expectation | Parser/help/dispatch tests prove the contract; final capability proof is successor-owned. | Do not mark end-to-end extraction complete. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `pairflow bubble extract` CLI | CLI operators, tests, successor tasks | additive | Add new command contract. | Path/copy/commit/docs in tasks 2-4. |
| Extract result/failure shape | CLI renderer, tests, successor implementation | additive | Define stable fields and reason codes. | Commit SHA and copied path population in task 3. |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Existing bubble subcommands dispatch. | preserve | Existing CLI index tests still pass; add extract without breaking supported list. | P1 | required-now |
| `bubble commit` means lifecycle commit. | preserve | No extract code calls `runBubbleCommitCommand` or `commitBubble`. | P1 | required-now |
| `bubble delete` owns cleanup. | preserve | No `--delete-bubble` help/parser/result field exists. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| CLI command contract | N/A | Parser/help/dispatch tests. | canonical | no | P1 | required-now |
| Extract execution result | N/A | Structured contract/failure type tests. | canonical | no | P1 | required-now |
| End-to-end copied files | N/A | N/A in this task. | successor-owned | no | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| missing `--id` | option parsing | file copy, git staging/commit, bubble mutation | throw parse error with `EXTRACT_ID_REQUIRED` or exact canonical equivalent | P1 | required-now |
| missing `--path` | command option parse success | file copy, git staging/commit, bubble mutation | throw parse error with `EXTRACT_PATH_REQUIRED` or equivalent canonical reason | P1 | required-now |
| missing bubble | eligibility | file copy, git staging/commit, bubble mutation | structured failure with `EXTRACT_BUBBLE_NOT_FOUND` or exact canonical equivalent | P1 | required-now |
| unresolved target repo | repo authority match | file copy, git staging/commit, bubble mutation | structured failure with `EXTRACT_TARGET_REPO_UNRESOLVED` or exact canonical equivalent | P1 | required-now |
| `--message` without `--commit` | option parsing | file copy, git staging/commit, bubble mutation | throw parse error with `EXTRACT_MESSAGE_REQUIRES_COMMIT` or exact canonical equivalent | P1 | required-now |
| non-ideation bubble | eligibility | file copy, git staging/commit, bubble mutation | structured failure with `EXTRACT_IDEATION_REQUIRED` | P1 | required-now |
| ideation metadata parse warning | eligibility | file copy, git staging/commit, bubble mutation | structured failure with `EXTRACT_IDEATION_METADATA_INVALID` | P1 | required-now |
| repo mismatch | repo authority match | file copy, git staging/commit, bubble mutation | structured failure with `EXTRACT_REPO_MISMATCH` | P1 | required-now |
| target checkout invalid | target checkout guard | file copy, git staging/commit, bubble mutation | structured failure with `EXTRACT_TARGET_CHECKOUT_INVALID` | P1 | required-now |
| target path already exists on `main` | path validation in task 2 | file copy, git staging/commit, bubble mutation | structured failure with successor-owned target-conflict reason before transfer | P1 | successor-owned |
| implementation not yet complete | transfer execution | file copy, git staging/commit, bubble mutation | implementation-deferred failure/result with `EXTRACT_TRANSFER_NOT_IMPLEMENTED` that cannot be mistaken for success | P1 | required-now |

### 0h) Canonical Contract Matrix

| ID | Condition / Input | Owner | Output / Status | Reason / Error Code | Retained / Dropped Data | Side Effects | Required Test |
|---|---|---|---|---|---|---|---|
| CCM1 | `--help` | current task | help text | N/A | no command data retained | none | T1 |
| CCM2 | missing `--id` | current task | parse failure | `EXTRACT_ID_REQUIRED` | drop all parsed data | none | T2 |
| CCM3 | zero `--path` values | current task | parse failure | `EXTRACT_PATH_REQUIRED` | retain id/repo for diagnostics only if existing style supports it | none | T3 |
| CCM4 | one or more `--path` values | current task | parsed options | N/A | retain order and duplicates for successor validation | none | T4 |
| CCM5 | `--commit` without `--message` | current task | parsed commit intent with absent message | N/A | retain commit intent; task 3 owns deterministic default message generation | none | T5 |
| CCM6 | `--message` without `--commit` | current task | parse failure | `EXTRACT_MESSAGE_REQUIRES_COMMIT` | drop message | none | T6 |
| CCM7 | bubble lookup cannot resolve `--id` | current task | structured failure | `EXTRACT_BUBBLE_NOT_FOUND` | retain requested bubble id | none | T7 |
| CCM8 | target repo cannot resolve from `--repo` or cwd ancestry | current task | structured failure | `EXTRACT_TARGET_REPO_UNRESOLVED` | retain requested repo/cwd diagnostics | none | T8 |
| CCM9 | bubble resolves with `ideation.mode=true` | current task | eligibility pass | N/A | retain bubble id/repo/worktree refs for successor context | none | T9 |
| CCM10 | bubble resolves without `ideation.mode=true` | current task | structured failure | `EXTRACT_IDEATION_REQUIRED` | retain bubble id only | none | T10 |
| CCM11 | ideation metadata parse warning exists | current task | structured failure | `EXTRACT_IDEATION_METADATA_INVALID` | retain warning for diagnostics | none | T11 |
| CCM12 | target repo differs from resolved bubble `repoPath` | current task | structured failure | `EXTRACT_REPO_MISMATCH` | retain both repo paths for diagnostics | none | T12 |
| CCM13 | target checkout precondition fails | current task | structured failure | `EXTRACT_TARGET_CHECKOUT_INVALID` | retain precondition reason | none | T13 |
| CCM14 | target path already exists on `main` | successor task | structured failure before transfer | successor-owned target-conflict reason | retain selected path diagnostics only | none | T14 |
| CCM15 | valid preconditions but transfer not implemented yet | current task | implementation-deferred result/failure | `EXTRACT_TRANSFER_NOT_IMPLEMENTED` | retain selected paths and commit intent | none | T15 |

### 0i) Ownership and Deferred Semantics

| Surface / Decision | Owned By This Task | Emits / Records Only | Deferred Owner | Forbidden Interpretation / Fallback | Priority | Timing |
|---|---|---|---|---|---|---|
| Parsed `paths` | yes | yes, raw explicit path list | `2-extract-path-selection` | Raw parse success does not mean paths are safe or allowed. | P1 | required-now |
| Commit intent | yes | yes, boolean and optional message | `3-extract-copy-commit` | `--commit` here does not stage or commit. | P1 | required-now |
| Target checkout precondition taxonomy | yes | yes, pass/fail contract | `3-extract-copy-commit` | Passing contract checks does not mean files were copied. | P1 | required-now |
| Source bubble lifecycle | no | N/A | existing lifecycle commands | Extract must not infer cleanup from success. | P1 | required-now |

### 0j) Structured Contract Rules

| Structured Contract | Required Fields | Optional Fields | Allowed Top-Level Fields / Variants | Unknown / Malformed / Duplicate Behavior | Retention / Drop Rule | Fallback Status / Reason | Priority | Timing |
|---|---|---|---|---|---|---|---|---|
| CLI options | `id`, non-empty `paths` | `repo`, `message`, `commit`, `json`, `help` | exact named flags only | unknown flags rejected by `parseArgs`; duplicate paths retained as provided | retain explicit path order | parse errors for missing required fields | P1 | required-now |
| Extract result | `bubbleId`, `repoPath`, `paths`, `commitRequested`, `status` | `message`, `reasonCode`, `diagnostics`, future `commitSha` | `preconditions_passed`, `failed`, `implementation_deferred` | unknown internal variants forbidden by discriminated union | no file content retained | reason code required for failure/deferred | P1 | required-now |

### 0k) Mirrored Surface Checklist

| Canonical Matrix Row | Mirrored Surfaces | Required Alignment Rule | Summary-Only Surface? | Verification |
|---|---|---|---|---|
| CCM1-CCM5 | help text, parser tests, structured rules | flag names and required/optional status must match exactly | no | T1-T5 |
| CCM6-CCM13 | parser/precondition contract, L0 control summary, tests | reason codes and zero-side-effect rule must match | no | T6-T13 |
| CCM14 | parent plan no-overwrite rule, L0 guard elements, successor task 2 contract | task 1 must name the fail-closed no-overwrite rule without implementing conflict detection | no | T14 |
| CCM15 | CLI/result renderer and successor docs | must say transfer is not complete in this task | no | T15 |

### 1) File / Module Contract

| Target | Required Change | Priority | Timing |
|---|---|---|---|
| `src/v11/application/extract/extractCliCommand.ts` | Add parser/help/runner surface for `bubble extract`, following existing command module style. | P1 | required-now |
| `src/v11/application/extract/extractCommandContract.ts` | Define typed options, result variants, diagnostics, and reason-code taxonomy. | P1 | required-now |
| `src/v11/application/extract/extractCommandPreconditions.ts` | Define ideation eligibility, repo match, and target checkout precondition contract without path transfer. | P1 | required-now |
| `src/v11/application/extract/extractCommandDefaults.ts` | Wire default ports only as needed for lookup/repo/precondition checks. | P2 | required-now |
| `src/v11/application/extract/emitExtractV11.ts` | Export an application entrypoint if consistent with adjacent v11 command naming. | P2 | required-now |
| `src/cli/commands/bubble/extract.ts` | Re-export the v11 CLI command module. | P1 | required-now |
| `src/cli/index.ts` | Register `bubble extract` in supported command/help dispatch when implementation-deferred behavior is explicit. | P1 | required-now |
| `src/index.ts` | Export public command contract symbols only if adjacent commands do so. | P2 | required-now |
| `tests/cli/bubbleExtractCommand.test.ts` | Cover parser/help/result contract branches. | P1 | required-now |
| `tests/cli/index.test.ts` | Cover `bubble extract --help` and supported command recognition. | P1 | required-now |

### 2) Acceptance Criteria

| ID | Criterion | Priority | Timing |
|---|---|---|---|
| AC1 | `parseBubbleExtractCommandOptions` accepts repeated `--path` and returns `paths` in provided order. | P1 | required-now |
| AC2 | `parseBubbleExtractCommandOptions` rejects missing `--id`. | P1 | required-now |
| AC3 | `parseBubbleExtractCommandOptions` rejects missing `--path`. | P1 | required-now |
| AC4 | Help text documents `--id`, repeated `--path`, `--repo`, `--commit`, `--message`, `--json`, and does not mention `--delete-bubble`, globs, overwrite, or all changed files. | P1 | required-now |
| AC5 | The typed contract distinguishes parse success, precondition failure, and implementation-deferred transfer. | P1 | required-now |
| AC6 | `--message` is accepted only as commit-message intent with `--commit`; without `--commit`, it fails with `EXTRACT_MESSAGE_REQUIRES_COMMIT` or an exact canonical equivalent before path validation, copy, staging, or commit. | P1 | required-now |
| AC7 | Missing bubble and unresolved target repo are named fail-closed reasons before path validation, copy, staging, or commit. | P1 | required-now |
| AC8 | Ideation eligibility uses `ideation.mode=true` and does not require `task_pending=true`. | P1 | required-now |
| AC9 | Repo mismatch is a named fail-closed reason before path validation, copy, staging, or commit. | P1 | required-now |
| AC10 | Non-ideation, invalid ideation metadata, invalid target checkout, and implementation-deferred transfer each have named reason-code coverage before path validation, copy, staging, or commit. | P1 | required-now |
| AC11 | No-overwrite v1 behavior is anchored as a fail-closed successor contract: task 1 names it, and task 2 owns target-conflict detection/proof. | P1 | required-now |
| AC12 | Source bubble lifecycle mutation is explicitly absent from the command contract. | P1 | required-now |

### 3) Test Matrix

| ID | Test | Required Assertion | Priority | Timing |
|---|---|---|---|---|
| T1 | Help branch | `bubble extract --help` prints extract usage and no cleanup flag. | P1 | required-now |
| T2 | Missing id | Parser throws `EXTRACT_ID_REQUIRED` or exact canonical equivalent. | P1 | required-now |
| T3 | Missing path | Parser throws `EXTRACT_PATH_REQUIRED` or exact canonical equivalent. | P1 | required-now |
| T4 | Repeated path | Parser returns all `--path` values in order. | P1 | required-now |
| T5 | Commit intent | Parser records `commit=true` and optional `message`. | P1 | required-now |
| T6 | Message without commit | Parser throws `EXTRACT_MESSAGE_REQUIRES_COMMIT` or exact canonical equivalent. | P1 | required-now |
| T7 | Missing bubble | Precondition contract fails with `EXTRACT_BUBBLE_NOT_FOUND`. | P1 | required-now |
| T8 | Target repo unresolved | Precondition contract fails with `EXTRACT_TARGET_REPO_UNRESOLVED`. | P1 | required-now |
| T9 | Ideation eligible | Precondition contract accepts `ideation.mode=true` even when `task_pending=false`. | P1 | required-now |
| T10 | Non-ideation | Precondition contract fails with `EXTRACT_IDEATION_REQUIRED`. | P1 | required-now |
| T11 | Parse warning | Precondition contract fails with `EXTRACT_IDEATION_METADATA_INVALID`. | P1 | required-now |
| T12 | Repo mismatch | Precondition contract fails with `EXTRACT_REPO_MISMATCH`. | P1 | required-now |
| T13 | Target checkout invalid | Precondition contract fails with `EXTRACT_TARGET_CHECKOUT_INVALID`. | P1 | required-now |
| T14 | No-overwrite anchor | Task contract names existing target path conflict as successor-owned fail-closed behavior, not task-1 implementation. | P1 | required-now |
| T15 | Implementation deferred | Valid command path cannot report copied files or commit SHA in this task. | P1 | required-now |

## L2 - Hardening Backlog

1. `later-hardening`: add `--dry-run` output once path validation and transfer
   result shapes exist.
2. `later-hardening`: add richer target checkout diagnostics if existing git
   helper APIs expose stable reason codes.
3. `later-hardening`: add shell-completion metadata if the CLI gains a
   first-class completion system.

## Validation

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm vitest tests/cli/bubbleExtractCommand.test.ts tests/cli/index.test.ts`
5. `pnpm test`
6. `pnpm build`
