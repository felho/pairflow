---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_commit_policy_v1
task_family_id: commit-policy
sequence_key: "2"
task_id: 2-commit-policy
title: "Conventional Commit Policy and Bubble Lifecycle Message Compatibility"
status: approved
phase: phase2
target_files:
  - "AGENTS.md"
  - "docs/commit-message-guidance.md"
  - "package.json"
  - "scripts/install-git-hooks.sh"
  - "scripts/ci-local.sh"
  - ".githooks/commit-msg"
  - "tools/commit-policy/commitMessagePolicy.ts"
  - "tools/commit-policy/validateCommitMessage.ts"
  - "tools/commit-policy/validateCommitRange.ts"
  - "src/cli/commands/bubble/commit.ts"
  - "src/v11/application/commit/internal/git/commitCommandGitStep.ts"
  - "src/v11/application/commit/internal/pipeline/commitCommandPipeline.ts"
  - "src/v11/application/merge/internal/pipeline/localMergeStep.ts"
  - "tests/cli/bubbleCommitCommand.test.ts"
  - "tests/cli/bubbleMergeCommand.test.ts"
  - "tests/commitPolicy/commitMessagePolicy.test.ts"
prd_ref: null
plan_ref: plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-31-npm-release-dx-onboarding
---

# Task: Conventional Commit Policy and Bubble Lifecycle Message Compatibility

## L0 - Policy

### Goal

Add a repo-local conventional-commit policy that is explicit enough for humans, agents, hooks, CI, and release automation to share without making every agent session carry the full policy text. Reconcile Pairflow bubble lifecycle commit and merge messages with that policy so release-relevant implementation commits can become semver/changelog authority while lifecycle-only merge, revert, and housekeeping commits do not accidentally become release signals.

### Domain / Control Model Summary

1. Business invariant: commit-message policy must make future npm release automation predictable without blocking normal Pairflow bubble close/merge flows.
2. Control model: a dedicated repo-local guidance file owns human/agent policy; hook/CI logic owns mechanical validation; Pairflow bubble commit owns bubble branch commit messages; release automation will later own changelog/version interpretation.
3. Read-path rule: agents preparing commits read the guidance file through a short `AGENTS.md` pointer; hooks/CI read an explicit repo-local validation contract, not prose parsing.
4. Forbidden fallback: do not rely on undocumented commitlint defaults, remote release-tool behavior, branch names, merge commit text, or broad exemptions that let release-relevant commits bypass policy.
5. Allowed resolution path: deterministic allowlist validation may accept conventional commit messages, standard Git merge/revert messages, and explicitly recognized Pairflow lifecycle-only messages when they are classified as non-release authority.
6. Missing-data rule: when commit intent cannot be classified as release-relevant, lifecycle-only, merge, revert, or documentation/policy-only, validation must fail with actionable guidance.

### Plan Linkage

1. Parent plan gap closed: missing commit-message guidance/enforcement and Pairflow bubble lifecycle message compatibility.
2. Depends on: `1-package-version`.
3. Unlocks / impacts successors: unlocks `3-release-automation` by defining which commits are semver/changelog authority.
4. Task-list impact: prepares the repository for release automation without adding publishing or changelog generation.
5. Inherited validation / exit expectation: default repo verification plus focused commit-policy tests and bubble commit/merge tests.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `AGENTS.md`
   - `docs/commit-message-guidance.md`
   - `package.json`
   - `scripts/install-git-hooks.sh`
   - `.githooks/pre-push`
   - `.githooks/commit-msg`
   - `src/v11/application/commit/internal/git/commitCommandGitStep.ts`
   - `src/v11/application/commit/internal/pipeline/commitCommandPipeline.ts`
   - `src/v11/application/merge/internal/pipeline/localMergeStep.ts`
   - `tests/cli/bubbleCommitCommand.test.ts`
   - `tests/cli/bubbleMergeCommand.test.ts`
2. Canonical elements:
   - Detailed conventional commit guidance belongs in `docs/commit-message-guidance.md`, not inline in `AGENTS.md`.
   - `AGENTS.md` may contain only a short pointer that applies when preparing commits.
   - Release-relevant bubble implementation commits should use conventional commit messages.
   - Lifecycle-only merge/revert/cleanup messages are allowed but explicitly not semver authority.
   - Default `pairflow bubble commit` behavior must remain safe for non-release lifecycle closes and must give actionable guidance when a conventional message is required or recommended.
3. Guard elements:
   - Commit-message validation must not publish, tag, create releases, or configure npm tokens.
   - Release history strategy is defined for successor automation but no release automation is added here.
   - Merge commits remain compatible with normal Git and Pairflow merge flows.
4. Compat-only elements:
   - Existing default `bubble(<id>): finalize` messages may remain allowed only as lifecycle-only/non-release authority or be replaced by a documented conventional default if that preserves bubble close behavior.
5. Forbidden reinterpretations:
   - Do not treat default merge commits as semantic-version authority.
   - Do not turn `AGENTS.md` into the full commit policy document.
   - Do not make release automation or npm publish part of this task.
   - Do not block standard Git revert or merge commits needed for recovery.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `package.json` currently has no commit-policy script and installs only `.githooks/pre-push` through `scripts/install-git-hooks.sh`.
   - `.githooks/pre-push` runs `pnpm ci:local`.
   - `src/v11/application/commit/internal/git/commitCommandGitStep.ts` currently defaults to `bubble(<bubbleId>): finalize` when `pairflow bubble commit` has no `--message`.
   - `tests/cli/bubbleCommitCommand.test.ts` already covers parsing `--message`.
   - `tests/cli/bubbleMergeCommand.test.ts` covers merge command rendering, including started-remote wording.
2. Actual touched scope: mixed `contract_or_persisted_authority_foundation` plus `workflow_orchestration`.
3. Mutation entrypoints in scope: commit-message validation scripts/hooks and bubble commit message selection.
4. Hidden scope ruled out: changelog generation, release-please/semantic-release config, GitHub publish workflows, npm publish, tag creation, historical commit rewrite, and public docs site.
5. Branch inventory note:
   - release-relevant implementation commit vs lifecycle-only bubble commit
   - standard merge commit vs Pairflow merge output
   - standard revert commit vs conventional revert/fix commit
   - hook installed vs hook not installed
   - explicit `pairflow bubble commit --message` vs default message
   - conventional message valid vs invalid type/scope/subject
6. Why the declared task shape matches reality: the task defines and enforces commit metadata policy that later release automation will consume, but does not itself create releases.

### Refactor Classification

1. Classification: `N/A`.
2. Classification triggers: the task changes workflow policy, hook wiring, and CLI commit-message behavior; it is not a refactor.
3. Preparatory modifier: `no`.

### Authority Boundary Map

1. Authority producer: `docs/commit-message-guidance.md` produces operator-facing policy; validation code/config produces machine enforcement; bubble commit command produces bubble branch commit messages.
2. Stored authority: Git commit message history after this cutoff; hook/CI validation evidence.
3. In-scope consumers: developers/agents preparing commits, local `commit-msg` hook, repo-local CI/check command, `pairflow bubble commit`.
4. Explicit out-of-scope consumers: release automation, changelog generation, GitHub Release creation, npm publish workflow, and hosted CI release gating.
5. Export surfaces closed in this phase: yes for commit policy guidance and validation entrypoints; no for release automation interpretation beyond documented strategy.

### Canonical Contract Matrix

This matrix is the source of truth for commit-message classification in this task. All L0 policy prose, branch inventory, data contract, fallback behavior, acceptance criteria, docs examples, and successor release strategy notes are subordinate to it.

| Message Class | Example First Line | Accepted By Validator | Release Authority Classification | Validator Behavior | Guidance / Docs Requirement | Required Tests | Successor Ownership |
|---|---|---:|---|---|---|---|---|
| Conventional release-relevant commit | `feat(cli): add version output` | yes | release-relevant candidate | accept when type/scope/subject syntax is valid and type is allowlisted | document as preferred for implementation/product changes | valid conventional type/scope/subject cases | `3-release-automation` decides semver/changelog effect from accepted conventional commits |
| Breaking conventional commit | `feat(cli)!: change command contract` | yes | release-relevant candidate with breaking marker | accept only when `!` appears in the conventional header position and subject is non-empty | document breaking marker and require careful use | valid and malformed breaking-marker cases | `3-release-automation` decides major/minor behavior for the release model |
| Standard merge commit | `Merge branch 'bubble/2-commit-policy-impl'` | yes | non-release lifecycle/history authority | accept through explicit merge-pattern exception | document as allowed history shape but not semver authority | merge-pattern pass case | `3-release-automation` must ignore or explicitly support merge commits without treating them as semver authority |
| Standard revert commit | `Revert "feat(cli): add version output"` | yes | recovery authority; release impact depends on successor strategy | accept standard Git revert header and conventional `revert:` form | document recovery compatibility | revert pass cases | `3-release-automation` decides how reverted changes affect changelog/versioning |
| Pairflow lifecycle-only finalize | `bubble(2-commit-policy-impl): finalize` | yes only when classified as lifecycle-only/non-release authority, unless implementation chooses a stricter conventional-message requirement for implementation bubbles | non-release lifecycle authority | accept with explicit lifecycle classification or replace with a documented conventional default; if stricter behavior is chosen, fail with guidance for implementation bubbles | document that lifecycle-only messages are not semver authority and when `--message` should be used | lifecycle message pass or stricter-failure case matching the chosen implementation | `3-release-automation` must not infer semver from lifecycle-only finalize messages |
| Invalid or ambiguous prose | `update stuff` | no | none | reject with invalid first line, expected format, and guidance path | document common invalid examples | invalid message failure case | none |
| Unreadable commit message file | missing path or unreadable file | no | none | fail closed with file-read error and guidance path | document hook failure behavior briefly | unreadable-file failure case if validator exposes file input | none |

### Exact First-Line Acceptance Rules

The validator contract must be expressed as exact first-line allowlist rules. The implementation may use parser code instead of literal regular expressions, but the accepted language must not be broader than these rules without task refinement.

1. Conventional header:
   - Pattern: `^(feat|fix|docs|chore|refactor|test|build|ci|perf|revert)(\\([a-z0-9][a-z0-9-]*\\))?(!)?: [^\\s].+$`
   - Meaning: accepted; release-relevant candidate, with final semver/changelog effect owned by `3-release-automation`.
2. Standard merge header:
   - Pattern: `^Merge (branch|remote-tracking branch) .+$`
   - Meaning: accepted; non-release history/lifecycle authority.
3. Standard Git revert header:
   - Pattern: `^Revert \"[^\"]+\"$`
   - Meaning: accepted; recovery authority whose semver/changelog interpretation remains successor-owned.
4. Pairflow lifecycle-only finalize header:
   - Pattern: `^bubble\\([a-z0-9][a-z0-9_-]{1,38}\\): finalize$`
   - Meaning: accepted only as non-release lifecycle authority unless the implementation deliberately tightens implementation-bubble behavior to require an explicit conventional `--message`.
5. Empty, whitespace-only, unknown type, missing colon-space, invalid scope characters, malformed breaking marker, or vague prose:
   - Meaning: rejected with an actionable message and `docs/commit-message-guidance.md`.

### Ownership and Deferred Semantics

1. This task owns recording and enforcing commit-message classification policy for local development and repo-local CI/check reuse.
2. This task owns making Pairflow bubble commit/merge message behavior compatible with the classification matrix.
3. This task owns examples and operator guidance that tell humans and agents when to use `pairflow bubble commit --message "<conventional message>"`.
4. This task owns a local range-validation entrypoint (`tools/commit-policy/validateCommitRange.ts`) and `scripts/ci-local.sh` integration only when the current repository history can be checked deterministically without remote release tooling.
5. GitHub Actions release enforcement and release-pipeline commit range selection remain deferred to `3-release-automation`.
6. This task does not own semver bump calculation, changelog generation, GitHub Release creation, npm publish, or release workflow triggering.
7. `3-release-automation` owns interpreting accepted conventional commits for version/changelog output, including merge-history strategy, revert semantics, and lifecycle-only exclusion.
8. If this task emits a classification that successor automation cannot consume deterministically, the successor must route back to plan/task refinement instead of inventing release semantics.

### Mirrored Surface Checklist

When changing the commit classification contract, keep these surfaces aligned with the Canonical Contract Matrix:

1. L0 policy summary and forbidden fallback.
2. Scope reality / branch inventory.
3. Data / State Contract accepted and rejected message classes.
4. Interface / API Contract for hooks and validation commands.
5. Error / Fallback Contract.
6. L2 Acceptance Criteria.
7. `docs/commit-message-guidance.md` examples.
8. Focused commit-policy tests.
9. Successor release-history notes for `3-release-automation`.

### Baseline Preservation

1. Must-preserve behaviors:
   - Existing bubble close flow remains `approve -> commit -> merge`.
   - `pairflow bubble commit --message <text>` remains supported.
   - `pairflow bubble merge` remains able to create a normal Git merge commit.
   - Existing pre-push local CI hook remains installed by `scripts/install-git-hooks.sh`.
2. Allowed resolution paths:
   - Add `.githooks/commit-msg` alongside existing `.githooks/pre-push`.
   - Add a package script for commit-message validation that repo-local CI/check scripts and later release automation can reuse.
   - Add a small TypeScript or Node validation helper if the repo has no existing commitlint dependency.
3. Forbidden regression interpretations:
   - Do not require release tooling to be configured before commits can pass validation.
   - Do not make merge/revert recovery impossible.
   - Do not require changing historical commits.
4. Replacement proof required if changed: any change to default bubble commit message behavior must include tests proving release-relevant messages can be supplied and lifecycle close still works.

### Success / Completion Proof Boundary

1. Current canonical success proof source: local hooks install and Pairflow bubble commit tests.
2. Target canonical success proof source: focused commit-message validation tests, bubble commit/merge tests, installed hook wiring proof, and default repo verification.
3. Current canonical completion proof source: none for commit-message policy.
4. Target canonical completion proof source: guidance file, hook/CI script, tests, and task validation evidence.
5. Reused proof contract: `N/A`.
6. Proof-parity rule: `no_reuse`.
7. Final truth surfaces affected: Git commit messages accepted by local/CI checks, Pairflow bubble commit message defaults/guidance, `AGENTS.md` commit-prep pointer.
8. Mixed-truth surfaces allowed: guidance prose and validation implementation may coexist, but allowed taxonomy must be tested so they cannot drift silently.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `workflow_orchestration`.
2. Secondary shape: `contract_or_persisted_authority_foundation`.
3. Preconditions that must pass before side effects: package identity task is archived; plan says `2-commit-policy` is active; release automation remains out of scope.
4. Side effects forbidden before preconditions pass: no release tags, no GitHub Releases, no npm publish, no historical rebase.
5. Invalid/precondition-failure behavior: if commit-message strategy cannot reconcile Pairflow lifecycle messages with release authority, route back to plan refinement before implementing release automation.
6. Coordination primitives in scope: Git hooks, commit-message validation command, Pairflow bubble commit message option/default.

### In Scope

1. Create `docs/commit-message-guidance.md` with conventional commit format, release-relevant vs lifecycle-only classification, Pairflow bubble commit/merge expectations, merge/revert compatibility, and examples.
2. Add a short pointer in `AGENTS.md` telling agents to read the guidance file when preparing commits.
3. Add a local `commit-msg` hook through `.githooks/commit-msg` and update `scripts/install-git-hooks.sh` so both hooks are executable/installed.
4. Add a reusable validation command/script for commit messages that can be used by the hook and repo-local CI/check scripts.
5. Add focused tests for valid and invalid commit messages, including merge/revert and Pairflow lifecycle cases.
6. Reconcile `pairflow bubble commit` behavior with the policy:
   - preserve explicit `--message`
   - ensure the default or guidance does not create accidental release authority
   - add actionable error/help output when implementation bubbles should use conventional messages
7. Define the release-history strategy for successor automation:
   - release-relevant bubble branch commits are semver/changelog authority
   - normal merge commits and lifecycle-only commits are ignored or explicitly allowed without semver impact
8. Validate that `pairflow bubble merge` remains compatible with accepted merge commit handling.
9. Explicitly re-evaluate whether architecture fitness checks need updates for command orchestration or lifecycle message changes.

### Out of Scope

1. Release-please, semantic-release, changelog generation, release tags, GitHub Releases, and npm publish workflows.
2. npm tokens/secrets, GitHub environment approvals, or package publication.
3. Historical commit-message rewrite or rebase.
4. Public docs site / GitHub Pages.
5. Changing task archive/plan progression semantics.
6. Changing bubble lifecycle state transitions beyond commit-message handling.

### Safety Defaults

1. Prefer a narrow local validator over a new broad dependency unless the implementation can justify the dependency and lockfile change.
2. Prefer clear allowed exceptions for merge/revert/lifecycle-only commits over disabling validation for broad classes.
3. Prefer actionable failure messages that name the guidance file.
4. Prefer successor release automation consuming explicit commit classifications rather than guessing from merge messages.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - commit-message policy
   - local git hook installation
   - bubble commit message behavior
   - future release-history interpretation
3. Non-impacted contracts:
   - npm publish
   - changelog generation
   - package version bump automation
   - UI runtime behavior
4. Public surface: contributor/agent commit workflow and `pairflow bubble commit --message`.

## L1 - Implementation Contract

### Data / State Contract

1. Commit-message validator accepts:
   - conventional commits: `<type>(<optional-scope>): <subject>`
   - optional breaking marker: `<type>(<optional-scope>)!: <subject>`
   - standard merge commits such as `Merge branch 'bubble/<id>'`
   - standard revert commits such as `Revert "<subject>"`
   - explicitly allowed lifecycle-only Pairflow messages when documented as non-release authority
2. Commit-message validator rejects:
   - empty subjects
   - unknown conventional types
   - vague non-conventional prose
   - malformed breaking markers
   - ambiguous `bubble(...)` messages if the implementation chooses to require conventional messages for implementation bubbles
3. Allowed conventional types must be explicit and tested. Minimum expected set:
   - `feat`
   - `fix`
   - `docs`
   - `chore`
   - `refactor`
   - `test`
   - `build`
   - `ci`
   - `perf`
   - `revert`
4. Scope syntax must be deterministic and documented if scopes are accepted.
5. Validation output must include the guidance path on failure.

### Interface / API Contract

1. A package script validates one or more commit messages without requiring a real Git commit.
2. `.githooks/commit-msg` validates the message file passed by Git and exits non-zero on failure.
3. `scripts/install-git-hooks.sh` keeps installing `core.hooksPath .githooks` and ensures both `pre-push` and `commit-msg` hooks are executable.
4. `pairflow bubble commit --message <message>` remains the operator override for release-relevant implementation commit messages.
5. If default bubble commit messages remain non-conventional, they must be documented as lifecycle-only and the validator must classify them accordingly.
6. `scripts/ci-local.sh` or a documented package script must invoke a deterministic commit-range validation path when a local range can be derived safely; hosted release CI selection remains deferred to `3-release-automation`.

### Control Flow / Lifecycle Contract

1. Normal Pairflow close flow remains unchanged:
   - `bubble approve`
   - `bubble commit`
   - `bubble merge`
2. The implementation must decide and encode how implementation bubbles receive conventional release-relevant commit messages:
   - either require/provide explicit conventional `--message` for release-relevant implementation bubbles, or
   - derive a safe conventional default from task metadata when deterministic.
3. Merge commits created by `pairflow bubble merge` must remain allowed by validation but excluded from release authority in the guidance.
4. Revert commits must remain allowed so recovery does not require policy bypass.

### Error / Fallback Contract

1. Invalid commit messages fail with an actionable error that includes:
   - the invalid first line
   - the expected format
   - the guidance path
2. If the validator cannot read the commit message file, fail closed.
3. If hook installation cannot set executable bits, fail closed with the failing hook path.
4. Do not silently skip validation because a command runs inside a bubble worktree.
5. If a commit-range validation command cannot determine a safe local range, it must print a clear skip/checkpoint reason rather than pretending hosted CI enforcement exists.

### Validation Contract

1. Add focused unit tests for the validator.
2. Update or add CLI tests for `pairflow bubble commit` behavior if message selection or help text changes.
3. Update or add merge tests proving merge commit messages remain policy-compatible when relevant.
4. Add tests for the exact first-line acceptance rules in the Canonical Contract Matrix.
5. Run at minimum:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm fitness:check:ci`
   - focused commit-policy tests
   - focused bubble commit/merge tests
   - `pnpm test`
   - `pnpm build`
6. If changing lifecycle, transcript/state ordering, execution-context ownership, state transition derivation, or command orchestration boundaries, update or explicitly re-evaluate `tools/fitness/**`. If no fitness change is needed, record why.

## L2 - Acceptance Criteria

1. `docs/commit-message-guidance.md` exists and explains the policy without bloating `AGENTS.md`.
2. `AGENTS.md` contains a short pointer to the guidance file for commit preparation.
3. A reusable commit-message validation command exists and is wired into `.githooks/commit-msg`.
4. `scripts/install-git-hooks.sh` installs/executability-checks both hooks.
5. `scripts/ci-local.sh` or an explicitly documented package script runs deterministic local commit-message/range validation without claiming hosted release CI is complete.
6. Valid conventional commit examples pass.
7. Invalid ambiguous messages fail with guidance.
8. Standard merge and revert messages pass.
9. Pairflow lifecycle-only messages are either accepted as explicitly non-release authority or replaced by tested conventional defaults.
10. Exact first-line allowlist rules are covered by focused tests.
11. `pairflow bubble commit --message "feat(...): ..."` remains supported and tested.
12. Release automation is not added.
13. No npm publish, tag, or release workflow is introduced.
14. Architecture fitness impact is updated or explicitly documented as not needed.
15. The full required validation set for this task is run or any skipped step is recorded with a concrete reason.

## Verification Notes

1. Focused likely commands:
   - `pnpm exec vitest run tests/commitPolicy/commitMessagePolicy.test.ts`
   - `pnpm exec vitest run tests/cli/bubbleCommitCommand.test.ts tests/cli/bubbleMergeCommand.test.ts`
2. Broad required commands are listed in the validation contract.
3. This task does not require browser/UI validation unless implementation unexpectedly touches UI sources.

## Implementation Notes

1. Keep the guidance terse and operational; examples should be enough for humans and agents to choose correct messages.
2. If a new validation helper is added, prefer a narrow module with explicit typed result output so tests can inspect reason codes.
3. Avoid a dependency-heavy commitlint setup unless the implementation can prove the additional package/config surface is worth it.
4. Commit-policy implementation affects workflow behavior, so include a short fitness-drift note in the task completion evidence.
