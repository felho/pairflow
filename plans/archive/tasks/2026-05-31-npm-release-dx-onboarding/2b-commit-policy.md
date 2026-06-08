---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_commit_policy_validation_v1
task_family_id: commit-policy
sequence_key: "2b"
task_id: 2b-commit-policy
title: "Commit Policy Validation and Local Gate Alignment"
status: archived
phase: phase2
target_files:
  - "package.json"
  - "scripts/install-git-hooks.sh"
  - "scripts/ci-local.sh"
  - ".githooks/commit-msg"
  - "tools/commit-policy/commitMessagePolicy.ts"
  - "tools/commit-policy/validateCommitMessage.ts"
  - "tools/commit-policy/validateCommitRange.ts"
  - "tests/commitPolicy/commitMessagePolicy.test.ts"
  - "tests/commitPolicy/validateCommitMessage.test.ts"
  - "tests/commitPolicy/validateCommitRange.test.ts"
  - "tests/commitPolicy/installGitHooks.test.ts"
  - "tests/commitPolicy/ciLocalCommitRange.test.ts"
prd_ref: null
plan_ref: plans/archive/plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 2b-commit-policy-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-31-npm-release-dx-onboarding
---

# Task: Commit Policy Validation and Local Gate Alignment

## L0 - Policy

### Goal

Implement the local commit-message validation layer that consumes the approved
`2a-commit-policy` taxonomy without changing Pairflow lifecycle commit
producers or release automation. The result should give humans, agents, hooks,
and local CI a deterministic fail-closed check for newly created commit
messages and safe local commit ranges.

### Plan Linkage

1. Parent plan gap closed now: missing repo-local commit-message enforcement for
   newly created commits and deterministic safe ranges.
2. Depends on: `2a-commit-policy`.
3. Unlocks: `2c-commit-policy` Pairflow commit producer/lifecycle alignment.
4. Does not unlock directly: `3-release-automation` still requires `2c` before
   release automation consumes the same history model.

### Control Model

1. Business invariant: local validation must enforce the approved taxonomy
   without treating historical lifecycle-finalize commits, merge artifacts, or
   body prose as semver/changelog authority.
2. Control model: `docs/commit-and-release-history-authority.md` remains the
   taxonomy source of truth; `tools/commit-policy/**` owns mechanical
   validation; `.githooks/commit-msg` and local scripts invoke validation but do
   not define policy; `2c` later owns Pairflow producer compatibility.
3. Read-path rule: validators read deterministic first-line headers from commit
   message files or explicit Git ranges. They may print guidance pointing to
   `docs/commit-message-guidance.md`, but they must not parse guidance prose as
   policy.
4. Forbidden fallback: do not classify from commit body text, footers, branch
   names, PR titles, release-tool defaults, broad merge-message exemptions,
   historical cutoff heuristics, or legacy finalize compatibility modes.
5. Allowed resolution path: accept only the approved first-line classes from the
   authority taxonomy; validate a commit range only when an explicit safe range
   is provided by the operator, hook, lifecycle, or CI context.
6. Missing-data rule: a range-validation command with no safe range must exit
   non-zero with a checkpoint reason. Broad local CI may skip range validation
   only when it clearly reports that no safe new-commit range was available and
   does not claim that range validation passed.

### Scope Reality / Shape Proof

1. Target-file reality:
   - `package.json` has no commit-policy scripts yet.
   - `.githooks/pre-push` already runs `pnpm ci:local`.
   - `scripts/install-git-hooks.sh` currently installs only `.githooks/pre-push`.
   - `.githooks/commit-msg` does not exist yet.
   - `tools/commit-policy/**` and `tests/commitPolicy/**` do not exist yet.
2. Primary bounded-task shape: `consumer_family_alignment`, because this task
   aligns local validator/gate consumers to the existing `2a` taxonomy
   authority.
3. Secondary bounded-task shape: `activation_or_read_model`, because package
   scripts, a Git hook, and local CI expose the validator through operator
   activation surfaces.
4. Mutation entrypoints in scope: package scripts, Git hook installation,
   commit-msg hook execution, and local CI range-check wiring.
5. Out of scope: `pairflow bubble commit`, remote commit behavior, merge
   producer behavior, `bubble extract --commit`, changelog generation, semantic
   versioning, tags, GitHub Releases, npm publish, and historical commit
   rewriting.

### Complexity Risk Triage

1. `risk_score`: 5.
2. `authority_risk`: 1, because this task consumes an approved authority rather
   than changing it.
3. `surface_spread`: 2, because validator, scripts, hooks, and tests must agree.
4. `identity_join_risk`: 0.
5. `activation_coupling`: 1, because a local commit-msg hook is activated when
   hooks are installed.
6. `prerequisite_risk`: 0, because `2a` is archived and provides the taxonomy.
7. `acceptance_multiplicity`: 1, because message validation and range
   validation are separate but share one policy module.
8. `split_decision`: `single_task_allowed: yes`.
9. `single_task_allowed_reason`: the validator module is the shared authority
   consumer, and hook/range entrypoints are thin invocations over that same
   module. Pairflow producer changes and release automation remain split out.

### Authority Fan-out Scan

| Generic Bucket | Status | Evidence / Boundary |
|---|---|---|
| `authority_producer` | present, deferred | `2a` already produced the taxonomy authority docs; runtime commit-message producers such as `pairflow bubble commit` and `bubble extract --commit` also produce commit messages, but producer compatibility is owned by `2c`. This task must not modify producer behavior. |
| `persisted_authority` | absent | No docs authority or schema authority is created here. |
| `internal_execution_consumers` | present, deferred | Pairflow runtime commit/extract producers are real consumers, but producer compatibility is owned by `2c`; this task may expose reusable validator functions only. |
| `validator_gate_consumers` | present | Validator module, CLI entrypoints, package scripts, hooks, and tests consume the taxonomy. |
| `external_integration_consumers` | present | Git `commit-msg` hook and hook installer integrate validation into local Git. |
| `workflow_orchestration_consumers` | present | Deferred: Pairflow lifecycle producer compatibility is owned by `2c`; this task may provide reusable validator functions only. |
| `read_model_consumers` | present | Deferred: release automation interpretation is owned by `3-release-automation`. |
| `cleanup_recovery_consumers` | present | Revert and merge recovery classes are validated here, but producer/release effects are successor-owned. |

### Closure-Budget Gate

| Closure Bucket | Current Task Closure | Evidence / Boundary |
|---|---|---|
| `authority_producer` | absent | `2a` produced the taxonomy authority; this task consumes it through validators only. |
| `shared_contract` | present, collapsed | The shared taxonomy contract was closed by `2a`; this task consumes it and closes a new mechanical validator/API contract for `tools/commit-policy/commitMessagePolicy.ts`, validator CLI output behavior, and later `2c` reuse. |
| `internal_execution_consumers` | absent | Pairflow runtime producer and extract behavior are explicitly deferred to `2c`; no `src/**` producer files are in target scope. |
| `validator_gate_consumers` | present | Policy module, message CLI, range CLI, package scripts, hooks, and tests are closed here. |
| `external_integration_consumers` | present | Commit-msg hook and hook installer update are closed here. |
| `workflow_orchestration_consumers` | absent | Fan-out present, closure deferred: Pairflow commit/merge/extract producer behavior remains `2c`. |
| `read_model_consumers` | absent | Fan-out present, closure deferred: semver/changelog interpretation remains `3-release-automation`. |
| `persisted_authority_or_schema` | absent | No schema, stored authority, docs authority, or persisted policy source is created or modified here. |
| `cleanup_recovery_consumers` | present | Current closure is validation-only acceptance/rejection for merge and revert recovery classes. Lifecycle producer behavior remains deferred to `2c`; release/changelog effects remain deferred to `3-release-automation`. |

1. `split_required_triggered`: no.
2. Collapsed closures: validator module, message/range CLIs, package scripts,
   hook installer, commit-msg hook, and focused tests.
3. Collapse proof: all closed surfaces are one local validation/gate alignment
   closure:
   - validator module owns taxonomy classification;
   - message/range CLIs expose the same typed result contract;
   - package scripts expose only those CLIs;
   - `commit-msg` and hook installation only activate the message validator;
   - `scripts/ci-local.sh` only orders optional/required range validation
     before existing side-effectful local CI steps.
   These surfaces do not introduce a separate diagnostic policy, ordering
   feedback loop, Pairflow producer behavior, or release interpretation. The
   collapsed shared contract is limited to the mechanical validator API, CLI
   result behavior, hook activation proof, and local CI range-precondition
   ordering; it does not reopen the taxonomy authority.
4. Deferred closures: Pairflow lifecycle producer compatibility in `2c`;
   release/changelog consumption in `3-release-automation`.

### Bounded Task Shape

1. Primary shape: `consumer_family_alignment`.
2. Secondary shape: `activation_or_read_model`.
3. Safe shape proof: the task activates only local validation surfaces over an
   approved taxonomy. It does not change the commands that produce Pairflow
   lifecycle commits.
4. Current-task closure decomposition:
   - reusable commit-message policy module,
   - single-message validation CLI,
   - explicit safe-range validation CLI,
   - package scripts,
   - `.githooks/commit-msg`,
   - hook installer update,
   - focused validator/hook/range tests.
5. Not closed here: Pairflow commit producer defaults, remote commit producer
   behavior, merge producer behavior, `bubble extract --commit`, release
   traversal implementation, changelog/version behavior, and publish workflow.

### Producer Transition Boundary

1. `2b` intentionally installs or wires local validation before `2c` changes
   Pairflow commit producers.
2. During the `2b -> 2c` transition, installed `commit-msg` validation may
   reject current Pairflow default producer messages such as
   `bubble(<id>): finalize` or `extract(<id>): ...`.
3. Supported temporary paths are:
   - pass an explicit conventional `--message` where the producer command
     supports it;
   - or delay hook activation in producer worktrees until `2c` lands.
4. This task must not add a compatibility mode that accepts new finalize-style
   or extract-style producer defaults.
5. Any automatic producer-message rewrite, default-message change, or lifecycle
   compatibility behavior remains owned by `2c`.

### Capability Closure

| Capability Claim | Closure Classification | Activation Trigger / Entrypoint | Config Owner / Boundary | Success / Failure Output Contract | Last-Mile Proof |
|---|---|---|---|---|---|
| A single commit message can be validated locally. | `end_to_end` | Operator or hook runs `pnpm commit-policy:validate-message -- <message-file>`; Git passes the message file to `.githooks/commit-msg`. | Repo provides validator CLI, package script, and hook wrapper; operator/Git provides the message file. | Success exits zero with a concise accepted class; failure exits non-zero with the rejected reason and `docs/commit-message-guidance.md` pointer. | Focused tests cover accepted and rejected first-line classes plus CLI exit codes. |
| A safe explicit range of new commits can be validated locally. | `end_to_end` | Operator or CI runs `pnpm commit-policy:validate-range -- --from <base> --to <head>`. | Repo provides range CLI and package script; caller owns selecting and passing a safe explicit range. | Success exits zero with a concise validated range summary; invalid commits exit non-zero with all invalid commit headers reported; missing range exits non-zero with a checkpoint reason. | Focused tests cover valid ranges, invalid ranges, missing safe range fail-closed behavior, and multi-commit reporting. |
| Installed hooks enforce commit messages. | `end_to_end` | Operator runs `pnpm hooks:install`; later Git invokes `.githooks/commit-msg` during commit creation. | Repo provides `.githooks/commit-msg`, installer, and package script wiring; operator owns running installer in the checkout; Git owns honoring `core.hooksPath`. | Installer success prints both active hooks; installer failure exits non-zero before claiming activation; commit-msg success/failure mirrors message validator output. | Hook installer and hook tests prove `.githooks/pre-push` remains installed and `.githooks/commit-msg` invokes the validator. |
| Local CI range validation remains honest when no safe range exists. | `hook_only` | `pnpm ci:local` may invoke range validation only when an explicit safe range is available from its environment or caller. | Repo owns local CI messaging and optional invocation; caller owns providing safe range context. | With a safe range, CI reports validated range success/failure; without one, CI prints `not validated` / `no safe range` and must not claim range validation passed. | Local CI tests or script coverage prove missing-range output does not claim pass and explicit-range mode invokes the range validator. |

### Scoped Invariants

| Invariant | Applies To | Does Not Apply To | Proof Surface | Deferred / External Surfaces | Reviewer Non-Goals |
|---|---|---|---|---|---|
| Classification is first-line only. | Policy module, message CLI, range CLI, commit-msg hook. | Release automation implementation. | Unit tests with body-only conventional candidates and invalid first lines. | `3-release-automation`. | Do not require changelog/version tests here. |
| New `bubble(<id>): finalize` messages are rejected. | Message and range validation for newly checked commits. | Rewriting old history. | Unit tests and missing-safe-range behavior. | `2c` changes producer behavior later. | Do not require Pairflow commit producer changes here. |
| Safe ranges are explicit. | Range CLI and any local CI integration. | Arbitrary all-history scans. | Range CLI tests and local CI output contract. | Lifecycle-provided ranges in `2c`; release ranges in `3`. | Do not require release traversal here. |

### Review Scope Fence

| Edge Case Family | Why Not Required Now | Safe Current Behavior | Review Handling | Route |
|---|---|---|---|---|
| Pairflow default finalize producer | Owned by `2c`. | Validator rejects new finalize messages once invoked; producer remains unchanged until `2c`. | Treat runtime producer edits as scope expansion. | follow_up |
| `bubble extract --commit` producer | Owned by `2c`. | Validator rejects default `extract(<id>): ...` messages once invoked unless the operator supplies an explicit conventional `--message` or delays hook activation until `2c`. | Treat extract producer default-message or compatibility edits as scope expansion. | follow_up |
| Remote bubble commit producer | Owned by `2c`. | No remote behavior changes here. | Treat remote lifecycle edits as scope expansion. | follow_up |
| Release automation full-history traversal | Owned by `3-release-automation`. | Range validator can validate explicit local ranges only. | Treat release config as scope expansion. | follow_up |

## L1 - Implementation Contract

### Data / State Contract

1. `tools/commit-policy/commitMessagePolicy.ts` must export a typed policy API
   that classifies the first line of a commit message into taxonomy/result
   classes:
   conventional content, merge artifact, revert recovery, historical finalize,
   invalid/ambiguous, and missing/empty input.
2. The accepted conventional content types must be exactly `feat`, `fix`,
   `perf`, `refactor`, `docs`, `test`, `build`, `ci`, and `chore`, with
   optional scope and optional conventional breaking marker.
3. The merge artifact exception must accept only first lines beginning
   `Merge branch ...` or `Merge remote-tracking branch ...`.
4. Revert recovery must accept only standard Git revert first lines beginning
   `Revert "..."` and conventional revert first lines beginning `revert`
   under the same conventional header syntax.
5. New finalize-style lifecycle messages, including `bubble(<id>): finalize`,
   must be rejected with a reason that points to the guidance document.
6. Bodies, footers, branch names, PR titles, and later conventional-looking
   lines must not rescue or reclassify an invalid first line.
7. `tools/commit-policy/validateCommitMessage.ts` must validate a commit-msg
   file path and print actionable failures that point to
   `docs/commit-message-guidance.md`.
8. `tools/commit-policy/validateCommitRange.ts` must validate commits only when
   given an explicit safe range. With no explicit range, it must fail closed and
   report that the range was not validated.

### Canonical API Result Matrix

This matrix is the source of truth for message classification, range wrapper
results, exit-code expectations, and mirrored validation prose. Other sections
must stay subordinate to this matrix.

| Input Class | Example | Message Result | Message `class` | Message `reason_code` | Range Applicability / Result | Range `reason_code` | CLI Exit | Release Meaning Here | Output Contract |
|---|---|---|---|---|---|---|---|---|---|
| Conventional content | `feat(cli): add validator` | `accepted` | `conventional_content` | `accepted_conventional` | valid commit in explicit safe range -> range `validated` if all commits valid | `range_validated` | 0 | Not interpreted here; later consumed by `3-release-automation`. | Success may print concise accepted class. |
| Breaking conventional content | `feat(cli)!: change contract` | `accepted` | `breaking_conventional_content` | `accepted_breaking_conventional` | valid commit in explicit safe range -> range `validated` if all commits valid | `range_validated` | 0 | Not interpreted here beyond accepted class. | Success may print accepted class with breaking marker. |
| Merge artifact | `Merge branch 'bubble/x'` | `accepted` | `merge_artifact` | `accepted_merge_artifact` | tolerated artifact in explicit safe range -> range `validated` if all commits valid | `range_validated` | 0 | Explicitly no semver/changelog authority. | Success should identify merge artifact, not content commit. |
| Remote merge artifact | `Merge remote-tracking branch 'origin/main'` | `accepted` | `merge_artifact` | `accepted_merge_artifact` | tolerated artifact in explicit safe range -> range `validated` if all commits valid | `range_validated` | 0 | Explicitly no semver/changelog authority. | Success should identify merge artifact. |
| Standard revert | `Revert "feat(cli): add validator"` | `accepted` | `revert_recovery` | `accepted_revert_recovery` | recovery commit in explicit safe range -> range `validated` if all commits valid | `range_validated` | 0 | Recovery input only. | Success should identify revert recovery. |
| Conventional revert | `revert(cli): remove validator` | `accepted` | `revert_recovery` | `accepted_revert_recovery` | recovery commit in explicit safe range -> range `validated` if all commits valid | `range_validated` | 0 | Recovery input only. | Success should identify revert recovery. |
| Historical finalize | `bubble(2a-commit-policy): finalize` | `rejected` | `historical_finalize` | `rejected_finalize` | invalid checked commit in explicit safe range -> range `failed` | `range_contains_invalid_commit` | non-zero | Historical noise only; not accepted for new validation. | Error points to guidance and says finalize messages are rejected. |
| Ambiguous prose | `update stuff` | `rejected` | `ambiguous_prose` | `rejected_ambiguous` | invalid checked commit in explicit safe range -> range `failed` | `range_contains_invalid_commit` | non-zero | No release authority. | Error points to accepted first-line forms. |
| Empty/missing message | empty file or whitespace only | `rejected` | `empty_message` | `rejected_empty` | invalid checked commit in explicit safe range -> range `failed` | `range_contains_invalid_commit` | non-zero | No release authority. | Error states empty first line/message. |
| Body-only conventional candidate | first line `update stuff`, body contains `feat(cli): add x` | `rejected` | `body_only_conventional_candidate` | `rejected_body_only_conventional` | invalid checked commit in explicit safe range -> range `failed` | `range_contains_invalid_commit` | non-zero | Body cannot rescue first line. | Error states first-line-only classification. |
| Missing safe range | missing `--from` or `--to` | N/A | N/A | N/A | no checked range -> range `not_validated` for local CI skip or `failed` for required range/CLI invocation | `rejected_missing_safe_range` | non-zero for range CLI or required local CI; zero allowed only for default local CI honest-skip mode | No validation claim. | Exit non-zero with checkpoint reason when validation was requested/required; local CI may skip only with explicit `not validated` output. |

### Structured Validator API Contract

`commitMessagePolicy.ts` owns the mechanical validator API contract for this
task. Downstream tasks may depend only on this contract, not on undocumented
parser internals.

1. Exported entrypoint: `classifyCommitMessage(message: string): CommitMessagePolicyResult`.
2. `CommitMessagePolicyResult` must be a discriminated union with:
   - `status: "accepted" | "rejected"`;
   - `class`: one of `conventional_content`, `breaking_conventional_content`,
     `merge_artifact`, `revert_recovery`, `historical_finalize`,
     `ambiguous_prose`, `empty_message`, or
     `body_only_conventional_candidate`;
   - `reason_code`: stable machine-readable reason code;
   - `message`: short human-readable guidance text.
3. Accepted classes are exactly `conventional_content`,
   `breaking_conventional_content`, `merge_artifact`, and `revert_recovery`.
4. Rejected classes are exactly `historical_finalize`, `ambiguous_prose`,
   `empty_message`, and `body_only_conventional_candidate`.
5. Stable message reason codes are exactly:
   `accepted_conventional`, `accepted_breaking_conventional`,
   `accepted_merge_artifact`, `accepted_revert_recovery`,
   `rejected_finalize`, `rejected_ambiguous`, `rejected_empty`, and
   `rejected_body_only_conventional`.
6. Class-to-reason-code mapping is exact:
   - `conventional_content` -> `accepted_conventional`;
   - `breaking_conventional_content` -> `accepted_breaking_conventional`;
   - `merge_artifact` -> `accepted_merge_artifact`;
   - `revert_recovery` -> `accepted_revert_recovery`;
   - `historical_finalize` -> `rejected_finalize`;
   - `ambiguous_prose` -> `rejected_ambiguous`;
   - `empty_message` -> `rejected_empty`;
   - `body_only_conventional_candidate` ->
     `rejected_body_only_conventional`.
7. `classifyCommitMessage` must never return `missing_safe_range`; missing
   range state belongs to `CommitRangeValidationResult`.
8. `validateCommitRange.ts` must produce a separate
   `CommitRangeValidationResult` wrapper contract with:
   - `status: "validated" | "failed" | "not_validated"`;
   - `reason_code`: `range_validated`, `range_contains_invalid_commit`, or
     `rejected_missing_safe_range`;
   - per-commit `CommitMessagePolicyResult` entries when a range is present.
9. Range reason codes are exact and may not be extended by implementation:
   - `range_validated`: explicit safe range was checked and all checked commits
     produced accepted message results;
   - `range_contains_invalid_commit`: explicit safe range was checked and at
     least one commit produced a rejected message result;
   - `rejected_missing_safe_range`: range validation was requested or required
     without both explicit endpoints.
10. New message or range reason codes require a successor task or explicit task
    refinement before implementation; this task must not add implicit
    implementation-local reason codes.
11. CLI entry signatures:
   - `validateCommitMessage.ts <message-file>`;
   - `validateCommitRange.ts --from <base> --to <head>`.
12. CLI outputs may format human text freely, but exit codes and reason codes
   must preserve the result contract above.
13. `2c` may reuse the exported API and stable reason codes, but it must not
    reinterpret rejected classes as accepted producer compatibility.

### Closed-Contract Drift Record

| Field | Record |
|---|---|
| `source_anchors` | Archived `2a-commit-policy`, `docs/commit-and-release-history-authority.md`, `docs/commit-message-guidance.md`, parent plan coverage map and validation strategy. |
| `closed_terms` | First-line-only classification; closed conventional type allowlist; exact merge header exceptions; standard and conventional revert recovery; historical finalize as old-history noise only; new finalize rejection; explicit safe-range validation. |
| `canonical_elements` | First-line-only classification; closed conventional type allowlist; exact merge prefixes; standard/conventional revert acceptance; new finalize rejection; explicit safe-range requirement. |
| `guard_elements` | Guidance file is output guidance only, not parser input; local CI may not claim range validation passed when no safe range exists. |
| `compat_elements` | Existing historical finalize commits may remain in old history, but checked new commits fail. |
| `forbidden_reinterpretations` | Do not add first-parent release semantics, all-history validation, cutoff compatibility, broad merge exemptions, or Pairflow producer changes. |
| `downstream_impact` | `2c` can call or reuse the validator when aligning producers; `3-release-automation` can rely on the same classes after `2c` closes producer compatibility. |
| `drift_status` | `no_drift`: this task implements the closed taxonomy mechanically and must not reinterpret authority semantics. |

### Mirrored Surface Checklist

If the canonical API result matrix changes, these surfaces must be checked and
kept subordinate to the matrix rather than treated as separate sources of
truth:

1. L0 control model and forbidden fallback.
2. Authority fan-out scan.
3. Closure-budget gate.
4. Data / State Contract.
5. Error / Fallback Contract.
6. Structured Validator API Contract.
7. Interface / API Contract.
8. Capability Closure output contracts.
9. Scoped Invariants.
10. Review Scope Fence.
11. Validation Contract.
12. L2 Acceptance Criteria.

### Ownership and Deferred Semantics

1. `2b-commit-policy` owns validation mechanics only: policy module,
   validators, package scripts, local hook wiring, and focused tests.
2. `2b` may add reusable typed functions intended for `2c`, but it must not
   import or modify Pairflow lifecycle command producer code.
3. `.githooks/commit-msg` must be a thin shell wrapper over the message
   validator and must not embed taxonomy logic.
4. `scripts/install-git-hooks.sh` must preserve existing pre-push installation
   and add commit-msg installation without replacing `core.hooksPath` semantics.
   It must verify required hook files exist and are readable before writing
   `core.hooksPath`, changing executable bits, or printing active-hook status.
5. `scripts/ci-local.sh` must support explicit safe-range validation through
   `PAIRFLOW_COMMIT_RANGE_FROM=<base>` and `PAIRFLOW_COMMIT_RANGE_TO=<head>`.
   When both are present, it must run range validation before side-effectful
   install/build/test steps and fail closed on invalid commits.
6. If `PAIRFLOW_COMMIT_RANGE_REQUIRED=1` and either range endpoint is missing,
   `scripts/ci-local.sh` must fail closed before side-effectful
   install/build/test steps.
7. If range endpoints are missing and `PAIRFLOW_COMMIT_RANGE_REQUIRED` is not
   `1`, `scripts/ci-local.sh` may skip range validation only by printing an
   explicit `not validated` / `no safe range` message and must not claim that
   range validation passed.
   Creating the local CI evidence/log directory before this check is allowed as
   bounded diagnostic setup only; dependency installation, build, test,
   fitness, smoke, hook mutation, and Git configuration changes are forbidden
   before a required range precondition passes.
8. `2c-commit-policy` owns producer compatibility and may decide how lifecycle
   commands provide explicit ranges or messages to the validator.
9. `3-release-automation` owns exact release-range selection and changelog or
   semver interpretation.

### Interface / API Contract

1. `commitMessagePolicy.ts` must expose typed results conforming to the
   Structured Validator API Contract rather than only strings, so callers and
   tests can distinguish accepted classes from rejected reasons.
2. `validateCommitMessage.ts` must accept a commit message file path compatible
   with Git's `commit-msg` hook argument.
3. `validateCommitRange.ts` must accept explicit `--from <base> --to <head>`
   range inputs and must not default to broad history scanning.
4. `package.json` must expose package scripts for message and range validation.
5. All command failures must use non-zero exit codes.

### Control Flow / Lifecycle Contract

1. Commit-msg hook flow:
   - Git passes the message file path.
   - Hook changes to repo root.
   - Hook invokes the package script or validator CLI.
   - Validator reads only the message file, classifies the first line, and exits
     zero/non-zero.
2. Hook installation flow:
   - `pnpm hooks:install` verifies `.githooks/pre-push` and
     `.githooks/commit-msg` exist and are readable before mutating Git config or
     filesystem mode.
   - Only after successful preflight, it sets `core.hooksPath` to `.githooks`.
   - It marks both `.githooks/pre-push` and `.githooks/commit-msg` executable.
   - It prints both active hooks only after preflight, config, and executable-bit
     updates succeed.
3. Range validation flow:
   - Command verifies an explicit safe range exists.
   - It enumerates commits in that range deterministically.
   - It validates each first-line header independently.
   - It reports all invalid commits or a concise pass summary.
4. Local CI flow:
   - Existing `pnpm ci:local` behavior remains intact.
   - If a safe range is unavailable, local CI must not fail solely because range
     context is missing unless the invoked mode explicitly requires range
     validation.

### Error / Fallback Contract

1. Unknown, malformed, empty, or ambiguous first lines fail closed.
2. A valid conventional-looking body line does not rescue an invalid first line.
3. Broad all-history validation is forbidden as a fallback for missing safe
   range context.
4. Merge-like prose outside the exact configured prefixes fails closed.
5. Finalize-style lifecycle messages fail closed for new validation.
6. Error output must point operators to `docs/commit-message-guidance.md`.

### Validation Contract

1. Add focused unit tests for `commitMessagePolicy.ts` covering every row of the
   canonical API result matrix.
2. Add CLI tests for message-file validation success/failure and actionable
   guidance output.
3. Add range validation tests covering explicit valid range, explicit invalid
   range, missing range fail-closed behavior, and body-only candidate rejection.
4. Add hook/installer coverage proving `commit-msg` is installed alongside
   existing `pre-push` behavior without dropping `pnpm ci:local`, and proving
   missing or unreadable required hook files stop before `core.hooksPath`,
   executable-bit changes, or active-hook success output.
   Proof file: `tests/commitPolicy/installGitHooks.test.ts`.
5. Add local CI coverage for:
   - explicit `PAIRFLOW_COMMIT_RANGE_FROM` / `PAIRFLOW_COMMIT_RANGE_TO` invokes
     range validation before install/build/test steps;
   - `PAIRFLOW_COMMIT_RANGE_REQUIRED=1` fails closed when the range is missing;
   - default missing-range mode prints `not validated` / `no safe range` without
     claiming a pass.
   Proof file: `tests/commitPolicy/ciLocalCommitRange.test.ts`.
6. Add at least one message-validator proof and one range-validator proof
   through the `pnpm commit-policy:validate-message` and
   `pnpm commit-policy:validate-range` package-script entrypoints.
7. Run focused tests for the new commit-policy suite.
8. Run `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, relevant focused
   tests, `pnpm test`, and `pnpm build` before declaring implementation
   complete, unless a bubble workflow records an explicit approved skip.

## L2 - Acceptance Criteria

1. `tools/commit-policy/commitMessagePolicy.ts` implements typed first-line-only
   classification matching the `2a` authority taxonomy.
2. `tools/commit-policy/validateCommitMessage.ts` validates Git commit message
   files and exits non-zero for invalid, empty, ambiguous, body-rescued, or
   finalize-style messages.
3. `tools/commit-policy/validateCommitRange.ts` validates only explicit safe
   ranges and fails closed with a checkpoint reason when no safe range is
   supplied.
4. `package.json` exposes scripts for message and range validation.
5. `.githooks/commit-msg` invokes the message validator without duplicating
   policy logic.
6. `scripts/install-git-hooks.sh` verifies required hook files exist and are
   readable before writing `core.hooksPath`, changing executable bits, or
   printing active-hook status; after that preflight, it installs/marks
   executable both `pre-push` and `commit-msg`, preserving the existing
   pre-push `pnpm ci:local` behavior.
7. `scripts/ci-local.sh` supports `PAIRFLOW_COMMIT_RANGE_FROM`,
   `PAIRFLOW_COMMIT_RANGE_TO`, and `PAIRFLOW_COMMIT_RANGE_REQUIRED=1` with the
   fail-closed and honest-skip behavior defined in L1.
8. Tests cover conventional allowlist, breaking marker, exact merge prefixes,
   standard/conventional reverts, finalize rejection, ambiguous prose, empty
   input, body-only conventional candidates, explicit range pass/fail, and
   missing range fail-closed behavior.
9. Tests include at least one message-validator and one range-validator proof
   through the package-script entrypoints named in the capability table.
10. No Pairflow runtime producer files under `src/**` are changed by this task.
11. No release automation, changelog, tag, GitHub Release, or npm publish
    configuration is added by this task.

## Verification Notes

1. Required focused validation: new `tests/commitPolicy/**` suite.
2. Required repo validation for implementation: `pnpm typecheck`, `pnpm lint`,
   `pnpm fitness:check:ci`, focused commit-policy tests, `pnpm test`, and
   `pnpm build`.
3. If `pnpm test` fails, report the exact failing command and suite/count; do
   not describe the repository as fully validated.

## Hardening Backlog

1. `later-hardening`: expose JSON output for validator CLIs if release
   automation or UI tooling needs machine-readable results.
2. `later-hardening`: add GitHub Actions commit-range enforcement only after
   the local safe-range behavior is proven and release automation wiring is
   planned.

## Document Refinement Notes

1. Document bubble `2b-commit-policy-doc` linked this approved task after the
   ReviewSpec task-mode decision `approve_task`.
2. The document-bubble close workflow applied the durable transition to
   `status: implementable` in the bubble worktree before lifecycle commit.
